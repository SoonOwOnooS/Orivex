import { env } from 'cloudflare:workers';
import { authConfig, getSessionUser } from './auth';
import { z } from 'zod';
import { translate } from './messages';
import { requestedLocale } from './locale-server';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// DB is the Cloudflare D1 database binding.
export function db() {
  if (!env.DB) {
    throw new HttpError(503, '数据库暂时不可用，请稍后重试。');
  }
  return env.DB;
}

// Trust the server session, never a user ID sent by the browser.
export async function writer(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new HttpError(403, '请从本站页面提交。');
  }
  const config = authConfig();
  if (config && origin !== config.origin) {
    throw new HttpError(403, '请从本站页面提交。');
  }
  const user = await getSessionUser(request.headers);
  if (!user) {
    throw new HttpError(401, '请先登录后再提交。');
  }
  return user;
}

// Check the actual byte count. Content-Length can be missing or incorrect.
export async function json(request: Request, maxBytes = 3000000) {
  if (Number(request.headers.get('content-length') || 0) > maxBytes) {
    throw new HttpError(413, '提交内容过大。');
  }
  const reader = request.body?.getReader();
  if (!reader) {
    throw new HttpError(400, '提交内容不能为空。');
  }
  let totalBytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, '提交内容过大。');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, '提交格式无效。');
  }
}

// Return a translated message without exposing server details.
export async function failure(error: unknown) {
  const locale = await requestedLocale();
  if (error instanceof HttpError) {
    return Response.json({ error: translate(error.message, locale) }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: translate('请检查必填内容、日期和链接格式。', locale) },
      { status: 400 },
    );
  }
  console.error('Request failed', error instanceof Error ? error.message : 'unknown');
  return Response.json(
    { error: translate('保存或读取暂时失败，请稍后重试，输入不会被清空。', locale) },
    { status: 503 },
  );
}

export const webUrl = z
  .string()
  .max(2000)
  .url()
  .refine((value) => /^https?:\/\//.test(value));
// Reject impossible dates such as February 31. Empty means not provided.
export const date = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
  );
// Count the last 24 hours. This is a per-account limit, not a global cost cap.
export async function quota(
  table: 'games' | 'comparisons' | 'reviews' | 'review_history' | 'responses' | 'archive_activity',
  field: 'created_by' | 'author_id' | 'user_id',
  userId: string,
  limit: number,
) {
  const timestamp = table === 'reviews' ? 'updated_at' : 'created_at';
  const row = await db()
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${field} = ? AND ${timestamp} >= ?`)
    .bind(userId, new Date(Date.now() - 86400000).toISOString())
    .first<{ n: number }>();
  if ((row?.n || 0) >= limit) {
    throw new HttpError(429, '过去 24 小时的提交次数已达到上限，请稍后再试。');
  }
}

// Show a short member label instead of the full GitHub account ID.
export function publicName(_fullName: string | null, userId: string) {
  return 'Member ' + userId.replace(/[^a-z0-9]/gi, '').slice(-6);
}
