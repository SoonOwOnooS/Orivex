import { z } from 'zod';
import { db, writer, json, failure, date, webUrl, quota, HttpError } from '../../../lib/server';
// Require a source link and at least one public date.
const schema = z
  .object({
    title: z.string().trim().min(1).max(100),
    developer: z.string().trim().min(1).max(100),
    announced: date,
    published: date,
    source_url: webUrl,
    description: z.string().trim().min(20).max(4000),
  })
  .refine((game) => !!(game.announced || game.published));
// Public read: return the newest 200 game records.
export async function GET() {
  try {
    const result = await db()
      .prepare(
        'SELECT id,title,developer,published,announced,source_url,description FROM games ORDER BY created_at DESC LIMIT 200',
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
    await db()
      .prepare(
        'INSERT INTO games (id,title,developer,published,announced,source_url,description,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        game.title,
        game.developer,
        game.published,
        game.announced,
        game.source_url,
        game.description,
        user.userId,
        new Date().toISOString(),
      )
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
