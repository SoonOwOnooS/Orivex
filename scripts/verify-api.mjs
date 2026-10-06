import {createFetchMock, Miniflare} from 'miniflare';
import {createHash, randomBytes} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runApiScenarios} from './verify-api-scenarios.mjs';
import {runAuthScenarios} from './verify-auth-scenarios.mjs';

const root = fileURLToPath(new URL('../dist/server/', import.meta.url));
const names = await readdir(root, {recursive: true});
const modules = ['index.js', ...names.filter(name => /\.m?js$/.test(name) && name !== 'index.js')]
  .map(name => ({type: 'ESModule', path: join(root, name)}));
const migrationsRoot = new URL('../drizzle/', import.meta.url);
const migrationNames = (await readdir(migrationsRoot))
  .filter(name => /^\d+.*\.sql$/.test(name)).sort();
const origin = 'http://127.0.0.1:8787';
const workers = [];

// Each worker owns an ephemeral database. No real login, network,
// persisted Wrangler state, or application-only authentication bypass is used.
async function createWorker(bindings = {
  AUTH_ORIGIN: origin,
  AUTH_GITHUB_CLIENT_ID: 'test-client',
  AUTH_GITHUB_CLIENT_SECRET: 'test-secret',
}) {
  const fetchMock = createFetchMock();
  fetchMock.disableNetConnect();
  const mf = new Miniflare({
    modules,
    modulesRoot: root,
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    bindings,
    fetchMock,
    d1Databases: {DB: 'local-api-test'},
  });
  workers.push({mf, fetchMock});
  const db = await mf.getD1Database('DB');
  for (const file of migrationNames) {
    const sql = await readFile(new URL(file, migrationsRoot), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint').map(value => value.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
  return {db, fetchMock, fetch: (url, options) => mf.dispatchFetch(url, {redirect: 'manual', ...options})};
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function mintSession(db, userId, options = {}) {
  const token = options.token ?? randomBytes(32).toString('base64url');
  const tokenHash = hash(token);
  await db.prepare('INSERT INTO auth_sessions (token_hash,user_id,display_name,expires_at) VALUES (?,?,?,?)')
    .bind(tokenHash, userId, options.displayName ?? 'PRIVATE FULL NAME', options.expiresAt ?? Date.now() + 3600000)
    .run();
  return {token, hash: tokenHash, cookie: `orivex-session=${token}`};
}

try {
  const worker = await createWorker();
  const context = {...worker, origin, hash, mintSession, createWorker};
  const api = await runApiScenarios(context);
  const auth = await runAuthScenarios(context);
  console.log(JSON.stringify({...api, ...auth}));
} finally {
  for (const {mf, fetchMock} of workers.reverse()) {
    await mf.dispose();
    await fetchMock.close();
  }
}
