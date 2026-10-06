import { z } from 'zod';
import {
  db,
  writer,
  json,
  failure,
  quota,
  HttpError,
  webUrl,
  publicName,
} from '../../../lib/server';
// Return current reviews, responses, and the review change history.
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      throw new HttpError(400, '请提供对照编号。');
    }
    const rows = await db().batch([
        db()
          .prepare(
            'SELECT display_name,verdict,reason,updated_at FROM reviews WHERE comparison_id=? ORDER BY updated_at DESC',
          )
          .bind(id),
        db()
          .prepare(
            'SELECT display_name,body,source_url,created_at FROM responses WHERE comparison_id=? ORDER BY created_at ASC',
          )
          .bind(id),
        db()
          .prepare(
            'SELECT display_name,verdict,reason,created_at FROM review_history WHERE comparison_id=? ORDER BY created_at DESC LIMIT 200',
          )
          .bind(id),
      ]);
    return Response.json(
      { reviews: rows[0].results, responses: rows[1].results, history: rows[2].results },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}

// Reviews and responses use the same API but have different fields.
export async function POST(request: Request) {
  try {
    const user = await writer(request);
    const submission = z
      .discriminatedUnion('kind', [
        z.object({
          kind: z.literal('review'),
          comparison_id: z.string().uuid(),
          verdict: z.enum(['similar', 'different', 'unclear']),
          reason: z.string().trim().min(20).max(2000),
        }),
        z.object({
          kind: z.literal('response'),
          comparison_id: z.string().uuid(),
          body: z.string().trim().min(20).max(2000),
          source_url: z.union([webUrl, z.literal('')]),
        }),
      ])
      .parse(await json(request, 20000));
    const comparison = await db()
      .prepare('SELECT author_id FROM comparisons WHERE id=?')
      .bind(submission.comparison_id)
      .first<{ author_id: string }>();
    if (!comparison) {
      throw new HttpError(404, '这条对照不存在。');
    }
    const now = new Date().toISOString();
    const displayName = publicName(user.fullName, user.userId);
    // Authors may add responses, but cannot review their own reports.
    if (submission.kind === 'review') {
      if (comparison.author_id === user.userId) {
        throw new HttpError(403, '提交者不能审核自己的对照，可在回应中补充证据。');
      }
      await quota('review_history', 'user_id', user.userId, 100);
      // Update the current vote and append history in one database transaction.
      await db().batch([
        db()
          .prepare(
            'INSERT INTO reviews (id,comparison_id,user_id,display_name,verdict,reason,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(comparison_id,user_id) DO UPDATE SET verdict=excluded.verdict,reason=excluded.reason,updated_at=excluded.updated_at,display_name=excluded.display_name',
          )
          .bind(
            crypto.randomUUID(),
            submission.comparison_id,
            user.userId,
            displayName,
            submission.verdict,
            submission.reason,
            now,
          ),
        db()
          .prepare(
            'INSERT INTO review_history (id,comparison_id,user_id,display_name,verdict,reason,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            submission.comparison_id,
            user.userId,
            displayName,
            submission.verdict,
            submission.reason,
            now,
          ),
      ]);
    } else {
      // Responses add context. They do not count as review votes.
      await quota('responses', 'user_id', user.userId, 50);
      await db()
        .prepare(
          'INSERT INTO responses (id,comparison_id,user_id,display_name,body,source_url,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          submission.comparison_id,
          user.userId,
          displayName,
          submission.body,
          submission.source_url,
          now,
        )
        .run();
    }
    return Response.json({ saved: true }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
