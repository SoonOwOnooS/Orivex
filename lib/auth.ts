import { env } from 'cloudflare:workers';

export type OrivexUser = { userId: string; displayName: string; fullName: string | null };
type AuthConfig = { origin: string; clientId: string; clientSecret: string; secure: boolean };
type OAuthState = { code_verifier: string; return_to: string };
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_SECONDS = 8 * 60 * 60;
const STATE_SECONDS = 10 * 60;

export class AuthError extends Error {
  constructor(public status: number, public kind: 'configuration' | 'origin' | 'state' | 'provider') {
    super(kind);
  }
}

// A fixed deployment origin prevents Host / forwarded-header injection.
export function authConfig(): AuthConfig | null {
  const { AUTH_ORIGIN, AUTH_GITHUB_CLIENT_ID, AUTH_GITHUB_CLIENT_SECRET } = env;
  if (!AUTH_ORIGIN || !AUTH_GITHUB_CLIENT_ID || !AUTH_GITHUB_CLIENT_SECRET || !env.DB) return null;
  try {
    const url = new URL(AUTH_ORIGIN);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !(url.protocol === 'https:' || (local && url.protocol === 'http:'))) return null;
    return { origin: url.origin, clientId: AUTH_GITHUB_CLIENT_ID, clientSecret: AUTH_GITHUB_CLIENT_SECRET, secure: url.protocol === 'https:' };
  } catch { return null; }
}

export function requireAuthConfig(request: Request): AuthConfig {
  const config = authConfig();
  if (!config) throw new AuthError(503, 'configuration');
  if (new URL(request.url).origin !== config.origin) throw new AuthError(403, 'origin');
  return config;
}

function cookieName(kind: 'session' | 'oauth', config: AuthConfig) {
  return `${config.secure ? '__Host-' : ''}orivex-${kind}`;
}

function readCookie(h: Headers, name: string): string | null {
  // Reject duplicate cookies rather than allowing ambiguous proxy / browser parsing.
  const values = (h.get('cookie') || '').split(';').map(x => x.trim())
    .filter(x => x.startsWith(`${name}=`)).map(x => x.slice(name.length + 1));
  return values.length === 1 && TOKEN.test(values[0]) ? values[0] : null;
}

function setCookie(kind: 'session' | 'oauth', value: string, seconds: number, config: AuthConfig) {
  return `${cookieName(kind, config)}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; SameSite=Lax${config.secure ? '; Secure' : ''}`;
}

function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function tokenHash(value: string) {
  return Array.from(await digest(value), x => x.toString(16).padStart(2, '0')).join('');
}

export function safeReturnPath(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://orivex.invalid');
    if (url.origin !== 'https://orivex.invalid' || url.pathname.startsWith('/auth/') ||
        ['/%2f', '/%5c'].some(prefix => url.pathname.toLowerCase().startsWith(prefix))) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}

export function signInPath(returnTo = '/') {
  return `/auth/signin?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
export function signOutPath() { return '/auth/signout'; }

export async function getSessionUser(h: Headers): Promise<OrivexUser | null> {
  const config = authConfig();
  if (!config) return null;
  const token = readCookie(h, cookieName('session', config));
  if (!token) return null;
  const row = await env.DB!.prepare('SELECT user_id,display_name FROM auth_sessions WHERE token_hash=? AND expires_at>?')
    .bind(await tokenHash(token), Date.now()).first<{ user_id: string; display_name: string }>();
  return row ? { userId: row.user_id, displayName: row.display_name, fullName: row.display_name } : null;
}

function redirectResponse(location: string, cookies: string[], status = 302) {
  const h = new Headers({ Location: location, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  for (const cookie of cookies) h.append('Set-Cookie', cookie);
  return new Response(null, { status, headers: h });
}

export async function beginSignIn(request: Request) {
  const config = requireAuthConfig(request);
  if (request.headers.get('origin') && request.headers.get('origin') !== config.origin) throw new AuthError(403, 'origin');
  if (request.headers.has('next-router-prefetch') || /prefetch/i.test(request.headers.get('purpose') || request.headers.get('sec-purpose') || '')) {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  const state = randomToken(), browser = randomToken(), verifier = randomToken();
  const now = Date.now();
  const returnTo = safeReturnPath(new URL(request.url).searchParams.get('return_to'));
  await env.DB!.batch([
    env.DB!.prepare('DELETE FROM oauth_states WHERE expires_at<=?').bind(now),
    env.DB!.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),
    env.DB!.prepare('INSERT INTO oauth_states (state_hash,browser_hash,code_verifier,return_to,expires_at) VALUES (?,?,?,?,?)')
      .bind(await tokenHash(state), await tokenHash(browser), verifier, returnTo, now + STATE_SECONDS * 1000),
  ]);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.origin}/auth/callback`,
    scope: '', state, code_challenge: base64url(await digest(verifier)), code_challenge_method: 'S256' }).toString();
  return redirectResponse(url.href, [setCookie('oauth', browser, STATE_SECONDS, config)]);
}

export async function completeSignIn(request: Request) {
  const config = requireAuthConfig(request);
  const url = new URL(request.url), state = url.searchParams.get('state'), code = url.searchParams.get('code');
  const browser = readCookie(request.headers, cookieName('oauth', config));
  if (!state || !TOKEN.test(state) || !browser || !code || code.length > 256 || url.searchParams.has('error') ||
      url.searchParams.getAll('state').length !== 1 || url.searchParams.getAll('code').length !== 1) throw new AuthError(400, 'state');
  // Consume once, atomically, and only in the browser that began this flow.
  const flow = await env.DB!.prepare('DELETE FROM oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING code_verifier,return_to')
    .bind(await tokenHash(state), await tokenHash(browser), Date.now()).first<OAuthState>();
  if (!flow) throw new AuthError(400, 'state');
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code,
        redirect_uri: `${config.origin}/auth/callback`, code_verifier: flow.code_verifier }),
      signal: AbortSignal.timeout(10000), redirect: 'manual',
    });
    const token = await response.json() as { access_token?: unknown; token_type?: unknown; error?: unknown };
    if (!response.ok || token.error || typeof token.access_token !== 'string' || token.access_token.length > 4096 || token.token_type !== 'bearer') throw new AuthError(502, 'provider');
    const identityResponse = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'Orivex', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000), redirect: 'manual',
    });
    const identity = await identityResponse.json() as { id?: unknown; login?: unknown };
    if (!identityResponse.ok || !Number.isSafeInteger(identity.id) || Number(identity.id) <= 0 ||
        typeof identity.login !== 'string' || !/^[a-zA-Z0-9-]{1,39}$/.test(identity.login)) throw new AuthError(502, 'provider');
    // The provider token and private profile fields are never persisted or sent to the browser.
    const session = randomToken(), previous = readCookie(request.headers, cookieName('session', config));
    const statements = [env.DB!.prepare('INSERT INTO auth_sessions (token_hash,user_id,display_name,expires_at) VALUES (?,?,?,?)')
      .bind(await tokenHash(session), `github:${identity.id}`, identity.login, Date.now() + SESSION_SECONDS * 1000)];
    if (previous) statements.push(env.DB!.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await tokenHash(previous)));
    await env.DB!.batch(statements);
    return redirectResponse(safeReturnPath(flow.return_to), [setCookie('oauth', '', 0, config), setCookie('session', session, SESSION_SECONDS, config)], 303);
  } catch (e) {
    if (e instanceof AuthError) throw e;
    // Do not log token exchange URLs, authorization codes, tokens or secrets.
    throw new AuthError(502, 'provider');
  }
}

export async function endSession(request: Request) {
  const config = requireAuthConfig(request);
  if (request.headers.get('origin') !== config.origin) throw new AuthError(403, 'origin');
  const token = readCookie(request.headers, cookieName('session', config));
  if (token) await env.DB!.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await tokenHash(token)).run();
  return redirectResponse('/', [setCookie('session', '', 0, config), setCookie('oauth', '', 0, config)], 303);
}

export function authFailure(error: unknown, request: Request) {
  const problem = error instanceof AuthError ? error : new AuthError(503, 'configuration');
  const zh = /(?:^|;\s*)orivex-locale=zh(?:;|$)/.test(request.headers.get('cookie') || '') ||
    (!/(?:^|;\s*)orivex-locale=en(?:;|$)/.test(request.headers.get('cookie') || '') && request.headers.get('accept-language')?.startsWith('zh'));
  const messages = {
    configuration: ['GitHub sign-in is not configured. The site owner must configure GitHub OAuth and apply the database migrations. Public browsing is still available.', 'GitHub 登录尚未配置。站点维护者需要配置 GitHub OAuth 并执行数据库迁移。仍可公开浏览。'],
    origin: ['This request did not come from the configured Orivex address.', '请从已配置的 Orivex 站点地址操作。'],
    state: ['This sign-in request is invalid or expired. Please start sign-in again.', '登录请求无效或已过期，请重新开始登录。'],
    provider: ['GitHub sign-in could not be completed. Please try signing in again.', '暂时无法完成 GitHub 登录，请重新登录。'],
  };
  return new Response(`<!doctype html><html lang="${zh ? 'zh' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orivex · GitHub</title><main><h1>Orivex</h1><p>${messages[problem.kind][zh ? 1 : 0]}</p><a href="/">${zh ? '返回公开页面' : 'Return to public browsing'}</a> · <a href="/auth/signin">${zh ? '重新登录' : 'Try sign-in again'}</a></main></html>`, {
    status: problem.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  });
}
