import { z } from 'zod';
export const MODEL_VERSION = 'transformers.js 3.8.1 / CLIP ViT-B32 / multilingual MiniLM-L12';
// Model scores range from -1 to 1. Null means that part was not analyzed.
const score = z.number().finite().min(-1).max(1).nullable();
const time = z.number().finite().min(0).max(600);
// Public frame data has only a time. Local frame data also has an image.
const metadataFrame = z.object({ time }).strict();
const localFrame = metadataFrame
  .extend({
    image: z
      .string()
      .max(180000)
      .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  })
  .strict();
// Keep the saved report format small and predictable. Unknown fields are rejected.
const base = z
  .object({
    texts: z.object({ a: z.string().max(800), b: z.string().max(800) }).strict(),
    version: z.literal('1.0'),
    model: z.literal(MODEL_VERSION),
    generated_at: z.string().datetime(),
    idea_similarity: score,
    video_similarity: score,
    coverage: z
      .object({
        samples: z.number().int().min(0).max(24),
        a_duration: time,
        b_duration: time,
        a_hash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
        b_hash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
        a_frame_count: z.number().int().min(0).max(24),
        b_frame_count: z.number().int().min(0).max(24),
        audio_processed: z.literal(false),
      })
      .strict(),
    matches: z
      .array(
        z
          .object({
            similarity: z.number().finite().min(-1).max(1),
            a: metadataFrame,
            b: metadataFrame,
          })
          .strict(),
      )
      .max(6),
    limitations: z.array(z.string().max(300)).max(10),
  })
  .strict();
export type PublishedReport = z.infer<typeof base>;
// Check that scores, sample counts, and video times agree.
function validate(report: PublishedReport, context: z.RefinementCtx) {
  if (report.idea_similarity === null && report.video_similarity === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: '至少需要一种分析结果' });
  }
  if (
    report.idea_similarity !== null &&
    (report.texts.a.trim().length < 20 || report.texts.b.trim().length < 20)
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: '文本证据不足' });
  }
  if (
    report.video_similarity !== null &&
    (!report.coverage.a_hash ||
      !report.coverage.b_hash ||
      !report.coverage.a_duration ||
      !report.coverage.b_duration ||
      !report.coverage.samples ||
      report.coverage.a_frame_count > report.coverage.samples ||
      report.coverage.b_frame_count > report.coverage.samples)
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: '视频采样信息不一致' });
  }
  if (
    report.matches.some(
      (match) =>
        match.a.time > report.coverage.a_duration || match.b.time > report.coverage.b_duration,
    )
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: '采样时间超出视频范围' });
  }
  if (
    report.video_similarity !== null &&
    (report.coverage.a_frame_count < 3 ||
      report.coverage.b_frame_count < 3 ||
      !report.matches.length)
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: '视频证据不足' });
  }
}

// The API accepts this metadata-only format.
export const publishedReportSchema = base.superRefine(validate);
// Local analysis and private exports may include JPEG frames.
export const reportSchema = base
  .extend({
    matches: z
      .array(
        z
          .object({ similarity: z.number().finite().min(-1).max(1), a: localFrame, b: localFrame })
          .strict(),
      )
      .max(6),
  })
  .superRefine(validate);
export type Report = z.infer<typeof reportSchema>;
// Publish only explicitly allowed metadata. Local images remain in the browser
// and in the user's own exported report; no image URL or bytes enter this payload.
export function toPublishedReport(report: Report | PublishedReport): PublishedReport {
  return {
    version: report.version,
    model: report.model,
    generated_at: report.generated_at,
    texts: { a: report.texts.a, b: report.texts.b },
    idea_similarity: report.idea_similarity,
    video_similarity: report.video_similarity,
    coverage: { ...report.coverage },
    limitations: [...report.limitations],
    matches: report.matches.map((match) => ({
      similarity: match.similarity,
      a: { time: match.a.time },
      b: { time: match.b.time },
    })),
  };
}
