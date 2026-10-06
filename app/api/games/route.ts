import { z } from 'zod';
import {
  db,
  writer,
  json,
  failure,
  date,
  webUrl,
  quota,
  HttpError,
  publicName,
} from '../../../lib/server';
// Require a source link and at least one public date.
const schema = z
  .object({
    title: z.string().trim().min(1).max(100),
    developer: z.string().trim().min(1).max(100),
    announced: date,
    published: date,
    source_url: webUrl,
    description: z.string().trim().min(20).max(4000),
    series: z.string().trim().max(100).default(''),
  })
  .refine((game) => !!(game.announced || game.published));
// Public read: return the newest 200 game records.
export async function GET() {
  try {
    const result = await db()
      .prepare(
        `SELECT id,title,developer,published,announced,source_url,description,series,
          (SELECT MIN(occurred_on) FROM archive_items WHERE game_id=games.id AND kind='evidence' AND removed=0) AS earliest_public
         FROM games ORDER BY created_at DESC LIMIT 200`,
      )
      .all();
    return Response.json({ games: result.results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}

// Private write: check login, validate inputs, then store a game.
export async function POST(request: Request) {
  try {
    const user = await writer(request);
    const game = schema.parse(await json(request, 20000));
    // Limit each account to 20 game submissions in the last 24 hours.
    await quota('games', 'created_by', user.userId, 20);
    // Reject the same game title and source link twice.
    const duplicate = await db()
      .prepare('SELECT id FROM games WHERE title=? AND source_url=?')
      .bind(game.title, game.source_url)
      .first();
    if (duplicate) {
      throw new HttpError(409, '这款游戏与来源已经登记过。');
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const statements = [
      db()
        .prepare(
          'INSERT INTO games (id,title,developer,published,announced,source_url,description,series,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          game.title,
          game.developer,
          game.published,
          game.announced,
          game.source_url,
          game.description,
          game.series,
          user.userId,
          now,
        ),
    ];
    // The registration source starts the timeline. Later records can correct it.
    for (const [category, occurredOn] of [
      ['showcase', game.announced],
      ['release', game.published],
    ]) {
      if (!occurredOn) continue;
      const entryId = crypto.randomUUID();
      const item = {
        kind: 'evidence',
        game_id: id,
        title: game.title,
        body: game.description.slice(0, 2000),
        url: game.source_url,
        category,
        occurred_on: occurredOn,
      };
      statements.push(
        db()
          .prepare(
            'INSERT INTO archive_items (id,game_id,kind,title,body,url,category,occurred_on,author_id,author_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            entryId,
            id,
            'evidence',
            game.title,
            item.body,
            game.source_url,
            category,
            occurredOn,
            user.userId,
            publicName(user.fullName, user.userId),
            now,
            now,
          ),
      );
      statements.push(
        db()
          .prepare(
            'INSERT INTO archive_revisions (id,item_id,revision,snapshot,reason,display_name,created_at) VALUES (?,?,1,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            entryId,
            JSON.stringify(item),
            '首次收录',
            publicName(user.fullName, user.userId),
            now,
          ),
      );
    }
    await db().batch(statements);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
