import { z } from 'zod';
import { getSessionUser } from '../../../lib/auth';
import { db, writer, json, failure, quota, HttpError, publicName } from '../../../lib/server';
import {
  archiveItemSchema,
  archiveEditSchema,
  archiveVoteSchema,
  itemFields,
  type ArchiveInput,
} from '../../../lib/archive';

const itemId = z.string().min(1).max(100);

async function viewerId(request: Request) {
  try {
    return (await getSessionUser(request.headers))?.userId || '';
  } catch {
    return '';
  }
}

// Read public records without exposing the submitter's account ID.
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (query.has('item_id')) {
      const id = itemId.parse(query.get('item_id'));
      const item = await db()
        .prepare('SELECT revision FROM archive_items WHERE id=? AND removed=0')
        .bind(id)
        .first<{ revision: number }>();
      if (!item) throw new HttpError(404, '这条档案记录不存在。');
      const [history, votes] = await db().batch<Record<string, unknown>>([
        db()
          .prepare(
            'SELECT revision,snapshot,reason,display_name,created_at FROM archive_revisions WHERE item_id=? ORDER BY revision DESC LIMIT 50',
          )
          .bind(id),
        db()
          .prepare(
            'SELECT revision,display_name,verdict,reason,updated_at FROM archive_votes WHERE item_id=? ORDER BY revision DESC,updated_at DESC LIMIT 100',
          )
          .bind(id),
      ]);
      return Response.json(
        {
          history: history.results.map((row) => ({
            ...row,
            snapshot: JSON.parse(row.snapshot as string),
          })),
          votes: votes.results,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const gameId = z.string().uuid().parse(query.get('game_id'));
    const game = await db()
      .prepare('SELECT id,title,developer,description,series FROM games WHERE id=?')
      .bind(gameId)
      .first();
    if (!game) throw new HttpError(404, '游戏记录不存在，请重新选择。');
    const userId = await viewerId(request);
    const rows = await db()
      .prepare(
        `
      SELECT a.id,a.game_id,a.kind,a.title,a.body,a.url,a.credit,a.category,a.occurred_on,
        a.author_name,a.revision,a.created_at,a.updated_at,(a.author_id=?) AS can_edit,
        (SELECT json_group_array(json_object('id',g.id,'title',g.title))
         FROM archive_related_games r JOIN games g ON g.id=r.game_id WHERE r.item_id=a.id) AS related_games,
        (SELECT COUNT(*) FROM archive_votes v WHERE v.item_id=a.id AND v.revision=a.revision AND v.verdict='supports') AS supports,
        (SELECT COUNT(*) FROM archive_votes v WHERE v.item_id=a.id AND v.revision=a.revision AND v.verdict='unclear') AS unclear,
        (SELECT COUNT(*) FROM archive_votes v WHERE v.item_id=a.id AND v.revision=a.revision AND v.verdict='disputes') AS disputes,
        (SELECT verdict FROM archive_votes v WHERE v.item_id=a.id AND v.revision=a.revision AND v.user_id=?) AS my_vote
      FROM archive_items a
      WHERE a.removed=0 AND (a.game_id=? OR (a.kind='fan' AND EXISTS (
        SELECT 1 FROM archive_related_games r JOIN games g ON g.id=r.game_id
        WHERE r.item_id=a.id AND (g.id=? OR (?<>'' AND g.series=?))
      )))
      ORDER BY a.created_at DESC,a.id DESC LIMIT 251
    `,
      )
      .bind(userId, userId, gameId, gameId, game.series, game.series)
      .all();
    const items = rows.results.slice(0, 250).map((row) => {
      const { supports, unclear, disputes, related_games, ...item } = row;
      return {
        ...item,
        can_edit: !!item.can_edit,
        related_games: JSON.parse(related_games as string),
        votes: { supports, unclear, disputes },
      };
    });
    return Response.json(
      { game, items, has_more: rows.results.length > 250 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}

// Validate related game IDs before writing any part of the item.
async function relatedIds(item: ArchiveInput) {
  const ids =
    item.kind === 'fan' ? [...new Set([item.game_id, ...item.related_game_ids])] : [item.game_id];
  const rows = await db()
    .prepare(`SELECT id FROM games WHERE id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all();
  if (rows.results.length !== ids.length) throw new HttpError(400, '游戏记录不存在，请重新选择。');
  return ids;
}

function activity(userId: string, now: string, conditional = false) {
  const sql = conditional
    ? 'INSERT INTO archive_activity (id,user_id,created_at) SELECT ?,?,? WHERE changes()>0'
    : 'INSERT INTO archive_activity (id,user_id,created_at) VALUES (?,?,?)';
  return db().prepare(sql).bind(crypto.randomUUID(), userId, now);
}

export async function POST(request: Request) {
  try {
    const user = await writer(request);
    const payload = await json(request, 20000);
    const now = new Date().toISOString();
    const name = publicName(user.fullName, user.userId);
    // Count all writes, including edits to an existing vote.
    await quota('archive_activity', 'user_id', user.userId, 120);
    if (payload && typeof payload === 'object' && payload.kind === 'vote') {
      const vote = archiveVoteSchema.parse(payload);
      const entry = await db()
        .prepare('SELECT author_id,kind,revision FROM archive_items WHERE id=? AND removed=0')
        .bind(vote.id)
        .first<{ author_id: string; kind: string; revision: number }>();
      if (!entry || entry.kind !== 'evidence') throw new HttpError(404, '这条时间线记录不存在。');
      if (entry.author_id === user.userId)
        throw new HttpError(403, '提交者不能核查自己的时间线记录。');
      if (entry.revision !== vote.revision)
        throw new HttpError(409, '记录已更正，请刷新后重新核查。');
      // Check the revision again inside the write to reject a concurrent correction.
      const result = await db().batch([
        db()
          .prepare(
            `INSERT INTO archive_votes (id,item_id,revision,user_id,display_name,verdict,reason,created_at,updated_at)
          SELECT ?,id,revision,?,?,?,?,?,? FROM archive_items WHERE id=? AND kind='evidence' AND revision=? AND author_id<>? AND removed=0
          ON CONFLICT(item_id,revision,user_id) DO UPDATE SET display_name=excluded.display_name,verdict=excluded.verdict,reason=excluded.reason,updated_at=excluded.updated_at`,
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            name,
            vote.verdict,
            vote.reason,
            now,
            now,
            vote.id,
            vote.revision,
            user.userId,
          ),
        activity(user.userId, now, true),
      ]);
      if (!result[0].meta.changes) throw new HttpError(409, '记录已更正，请刷新后重新核查。');
      return Response.json({ saved: true }, { status: 201 });
    }
    const item = archiveItemSchema.parse(payload);
    const ids = await relatedIds(item);
    const fields = itemFields(item);
    const duplicate = await db()
      .prepare(
        'SELECT id FROM archive_items WHERE game_id=? AND kind=? AND url=? AND occurred_on=? AND category=? AND removed=0',
      )
      .bind(item.game_id, item.kind, item.url, fields.occurred_on, fields.category)
      .first();
    if (duplicate) throw new HttpError(409, '这个来源已经收录，请查看现有记录。');
    const id = crypto.randomUUID();
    await db().batch([
      db()
        .prepare(
          'INSERT INTO archive_items (id,game_id,kind,title,body,url,credit,category,occurred_on,author_id,author_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          fields.game_id,
          fields.kind,
          fields.title,
          fields.body,
          fields.url,
          fields.credit,
          fields.category,
          fields.occurred_on,
          user.userId,
          name,
          now,
          now,
        ),
      ...ids.map((gameId) =>
        db()
          .prepare('INSERT INTO archive_related_games (item_id,game_id) VALUES (?,?)')
          .bind(id, gameId),
      ),
      db()
        .prepare(
          'INSERT INTO archive_revisions (id,item_id,revision,snapshot,reason,display_name,created_at) VALUES (?,?,1,?,?,?,?)',
        )
        .bind(crypto.randomUUID(), id, JSON.stringify(item), '首次收录', name, now),
      activity(user.userId, now),
    ]);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

// Corrections belong to the original submitter and preserve public history.
export async function PATCH(request: Request) {
  try {
    const user = await writer(request);
    const edit = archiveEditSchema.parse(await json(request, 20000));
    const current = await db()
      .prepare('SELECT author_id,revision,game_id,kind FROM archive_items WHERE id=? AND removed=0')
      .bind(edit.id)
      .first<{ author_id: string; revision: number; game_id: string; kind: string }>();
    if (!current) throw new HttpError(404, '这条档案记录不存在。');
    if (current.author_id !== user.userId) throw new HttpError(403, '只能修改自己提交的档案记录。');
    if (current.revision !== edit.revision)
      throw new HttpError(409, '记录已更正，请刷新后重新核查。');
    if (current.game_id !== edit.item.game_id || current.kind !== edit.item.kind)
      throw new HttpError(400, '更正不能改变记录类型或所属游戏。');
    const ids = await relatedIds(edit.item);
    await quota('archive_activity', 'user_id', user.userId, 120);
    const fields = itemFields(edit.item);
    const duplicate = await db()
      .prepare(
        'SELECT id FROM archive_items WHERE game_id=? AND kind=? AND url=? AND occurred_on=? AND category=? AND id<>? AND removed=0',
      )
      .bind(
        current.game_id,
        current.kind,
        edit.item.url,
        fields.occurred_on,
        fields.category,
        edit.id,
      )
      .first();
    if (duplicate) throw new HttpError(409, '这个来源已经收录，请查看现有记录。');
    const now = new Date().toISOString();
    const nextRevision = edit.revision + 1;
    // Every statement uses the old revision as a guard. A stale edit changes nothing.
    const statements = [
      db()
        .prepare(
          `INSERT INTO archive_revisions (id,item_id,revision,snapshot,reason,display_name,created_at)
        SELECT ?,id,?,?,?,?,? FROM archive_items WHERE id=? AND revision=? AND removed=0`,
        )
        .bind(
          crypto.randomUUID(),
          nextRevision,
          JSON.stringify(edit.item),
          edit.reason,
          publicName(user.fullName, user.userId),
          now,
          edit.id,
          edit.revision,
        ),
      db()
        .prepare(
          'DELETE FROM archive_related_games WHERE item_id=? AND EXISTS (SELECT 1 FROM archive_items WHERE id=? AND revision=? AND removed=0)',
        )
        .bind(edit.id, edit.id, edit.revision),
      ...ids.map((gameId) =>
        db()
          .prepare(
            'INSERT INTO archive_related_games (item_id,game_id) SELECT id,? FROM archive_items WHERE id=? AND revision=? AND removed=0',
          )
          .bind(gameId, edit.id, edit.revision),
      ),
      db()
        .prepare(
          'UPDATE archive_items SET title=?,body=?,url=?,credit=?,category=?,occurred_on=?,revision=?,updated_at=? WHERE id=? AND author_id=? AND revision=? AND removed=0',
        )
        .bind(
          fields.title,
          fields.body,
          fields.url,
          fields.credit,
          fields.category,
          fields.occurred_on,
          nextRevision,
          now,
          edit.id,
          user.userId,
          edit.revision,
        ),
      activity(user.userId, now, true),
    ];
    const result = await db().batch(statements);
    if (!result[result.length - 2].meta.changes)
      throw new HttpError(409, '记录已更正，请刷新后重新核查。');
    return Response.json({ saved: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await writer(request);
    const payload = z
      .object({ id: itemId, revision: z.number().int().positive() })
      .strict()
      .parse(await json(request, 1000));
    await quota('archive_activity', 'user_id', user.userId, 120);
    const result = await db().batch([
      db()
        .prepare(
          'UPDATE archive_items SET removed=1,updated_at=? WHERE id=? AND author_id=? AND revision=? AND removed=0',
        )
        .bind(new Date().toISOString(), payload.id, user.userId, payload.revision),
      activity(user.userId, new Date().toISOString(), true),
    ]);
    if (!result[0].meta.changes) throw new HttpError(409, '记录已变化或不属于你，请刷新后重试。');
    return Response.json({ saved: true });
  } catch (error) {
    return failure(error);
  }
}
