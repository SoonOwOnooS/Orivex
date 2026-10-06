import {z} from 'zod';
export const MODEL_VERSION='transformers.js 3.8.1 / CLIP ViT-B32 / multilingual MiniLM-L12';
const score=z.number().finite().min(-1).max(1).nullable();
const time=z.number().finite().min(0).max(600);
const metadataFrame=z.object({time}).strict();
const localFrame=metadataFrame.extend({image:z.string().max(180000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)}).strict();
const base=z.object({
  texts:z.object({a:z.string().max(800),b:z.string().max(800)}).strict(),
  version:z.literal('1.0'),model:z.literal(MODEL_VERSION),generated_at:z.string().datetime(),
  idea_similarity:score,video_similarity:score,
  coverage:z.object({samples:z.number().int().min(0).max(24),a_duration:time,b_duration:time,
    a_hash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),b_hash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    a_frame_count:z.number().int().min(0).max(24),b_frame_count:z.number().int().min(0).max(24),audio_processed:z.literal(false)}).strict(),
  matches:z.array(z.object({similarity:z.number().finite().min(-1).max(1),a:metadataFrame,b:metadataFrame}).strict()).max(6),
  limitations:z.array(z.string().max(300)).max(10),
}).strict();
export type PublishedReport=z.infer<typeof base>;
function validate(v:PublishedReport,c:z.RefinementCtx){
  if(v.idea_similarity===null&&v.video_similarity===null)c.addIssue({code:z.ZodIssueCode.custom,message:'至少需要一种分析结果'});
  if(v.idea_similarity!==null&&(v.texts.a.trim().length<20||v.texts.b.trim().length<20))c.addIssue({code:z.ZodIssueCode.custom,message:'文本证据不足'});
  if(v.video_similarity!==null&&(!v.coverage.a_hash||!v.coverage.b_hash||!v.coverage.a_duration||!v.coverage.b_duration||!v.coverage.samples||v.coverage.a_frame_count>v.coverage.samples||v.coverage.b_frame_count>v.coverage.samples))c.addIssue({code:z.ZodIssueCode.custom,message:'视频采样信息不一致'});
  if(v.matches.some(m=>m.a.time>v.coverage.a_duration||m.b.time>v.coverage.b_duration))c.addIssue({code:z.ZodIssueCode.custom,message:'采样时间超出视频范围'});
  if(v.video_similarity!==null&&(v.coverage.a_frame_count<3||v.coverage.b_frame_count<3||!v.matches.length))c.addIssue({code:z.ZodIssueCode.custom,message:'视频证据不足'});
}
export const publishedReportSchema=base.superRefine(validate);
export const reportSchema=base.extend({matches:z.array(z.object({similarity:z.number().finite().min(-1).max(1),a:localFrame,b:localFrame}).strict()).max(6)}).superRefine(validate);
export type Report=z.infer<typeof reportSchema>;
// Publish only explicitly allowed metadata. Local images remain in the browser
// and in the user's own exported report; no image URL or bytes enter this payload.
export function toPublishedReport(report:Report|PublishedReport):PublishedReport {
  return {version:report.version,model:report.model,generated_at:report.generated_at,
    texts:{a:report.texts.a,b:report.texts.b},idea_similarity:report.idea_similarity,video_similarity:report.video_similarity,
    coverage:{...report.coverage},limitations:[...report.limitations],
    matches:report.matches.map(m=>({similarity:m.similarity,a:{time:m.a.time},b:{time:m.b.time}}))};
}
