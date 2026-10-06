import { z } from 'zod';
import { db, writer, json, failure, quota, HttpError, publicName } from '../../../lib/server';
import { publishedReportSchema, toPublishedReport } from '../../../lib/report';
// Public read: strip images from older records too.
export async function GET() {
  try {
    const result = await db()
      .prepare(
        'SELECT c.id,c.a_id,c.b_id,c.author_name,c.note,c.analysis,c.created_at,a.title AS a_title,b.title AS b_title FROM comparisons c JOIN games a ON a.id=c.a_id JOIN games b ON b.id=c.b_id ORDER BY c.created_at DESC LIMIT 100',
      )
      .all();
    return Response.json(
      {
        comparisons: result.results.map((row) => ({
          ...row,
          analysis: publishedReportSchema.parse(
            toPublishedReport(JSON.parse(row.analysis as string)),
          ),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}

// Accept only report metadata. The strict schema rejects image fields.
export async function POST(request: Request) {
  try {
    const user = await writer(request);
    const comparison = z
      .object({
        a_id: z.string().uuid(),
        b_id: z.string().uuid(),
        note: z.string().trim().min(20).max(2000),
        share_permission: z.literal(true),
        analysis: publishedReportSchema,
      })
      .strict()
      .parse(await json(request, 20000));
    // Limit each account to 10 reports in the last 24 hours.
    await quota('comparisons', 'author_id', user.userId, 10);
    if (comparison.a_id === comparison.b_id) {
      throw new HttpError(400, '请选择两款不同游戏。');
    }
    // Both games must already exist, and they must be different.
    const records = await db()
      .prepare('SELECT id FROM games WHERE id IN (?,?)')
      .bind(comparison.a_id, comparison.b_id)
      .all();
    if (records.results.length !== 2) {
      throw new HttpError(400, '游戏记录不存在，请重新选择。');
    }
    const id = crypto.randomUUID();
    await db()
      .prepare(
        'INSERT INTO comparisons (id,a_id,b_id,author_id,author_name,note,analysis,created_at) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        comparison.a_id,
        comparison.b_id,
        user.userId,
        publicName(user.fullName, user.userId),
        comparison.note,
        JSON.stringify(comparison.analysis),
        new Date().toISOString(),
      )
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
