import {z} from 'zod';
import {db,writer,json,failure,quota,HttpError,publicName} from '../../../lib/server';
import {publishedReportSchema,toPublishedReport} from '../../../lib/report';
export async function GET(){try{const r=await db().prepare('SELECT c.id,c.a_id,c.b_id,c.author_name,c.note,c.analysis,c.created_at,a.title AS a_title,b.title AS b_title FROM comparisons c JOIN games a ON a.id=c.a_id JOIN games b ON b.id=c.b_id ORDER BY c.created_at DESC LIMIT 100').all();return Response.json({comparisons:r.results.map(x=>({...x,analysis:publishedReportSchema.parse(toPublishedReport(JSON.parse(x.analysis as string)))}))},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request){try{
  const u=await writer(req);
  const d=z.object({a_id:z.string().uuid(),b_id:z.string().uuid(),note:z.string().trim().min(20).max(2000),share_permission:z.literal(true),analysis:publishedReportSchema}).strict().parse(await json(req,20000));
  await quota('comparisons','author_id',u.userId,10);
  if(d.a_id===d.b_id)throw new HttpError(400,'请选择两款不同游戏。');
  const records=await db().prepare('SELECT id FROM games WHERE id IN (?,?)').bind(d.a_id,d.b_id).all();
  if(records.results.length!==2)throw new HttpError(400,'游戏记录不存在，请重新选择。');
  const id=crypto.randomUUID();
  await db().prepare('INSERT INTO comparisons (id,a_id,b_id,author_id,author_name,note,analysis,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,d.a_id,d.b_id,u.userId,publicName(u.fullName,u.userId),d.note,JSON.stringify(d.analysis),new Date().toISOString()).run();
  return Response.json({id},{status:201});
}catch(e){return failure(e);}}
