import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';

function cookies(response) {
  return response.headers.getSetCookie();
}

function cookieValue(response, name) {
  const cookie = cookies(response).find(value => value.startsWith(`${name}=`));
  assert(cookie, `Missing ${name} cookie`);
  return {header: cookie, pair: cookie.split(';')[0], value: cookie.split(';')[0].slice(name.length + 1)};
}

function assertCookie(header, secure = false) {
  assert.match(header, /; Path=\//);
  assert.match(header, /; HttpOnly/);
  assert.match(header, /; SameSite=Lax/);
  assert(!/; Domain=/i.test(header));
  assert.equal(/; Secure(?:;|$)/.test(header), secure);
}

async function countSessions(db) {
  return (await db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').first()).n;
}

export async function runAuthScenarios({fetch, db, origin, hash, mintSession, fetchMock, createWorker}) {
  async function begin(returnTo = '/compare?lang=zh#matches') {
    const response = await fetch(`${origin}/auth/signin?return_to=${encodeURIComponent(returnTo)}`);
    assert.equal(response.status, 302);
    const redirect = new URL(response.headers.get('location'));
    assert.equal(redirect.origin, 'https://github.com');
    assert.equal(redirect.pathname, '/login/oauth/authorize');
    assert.equal(redirect.searchParams.get('client_id'), 'test-client');
    assert.equal(redirect.searchParams.get('redirect_uri'), `${origin}/auth/callback`);
    assert.equal(redirect.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(redirect.searchParams.get('scope'), '');
    const state = redirect.searchParams.get('state');
    assert.match(state, /^[A-Za-z0-9_-]{43}$/);
    const browser = cookieValue(response, 'orivex-oauth');
    assert.match(browser.value, /^[A-Za-z0-9_-]{43}$/);
    assertCookie(browser.header);
    const flow = await db.prepare('SELECT * FROM oauth_states WHERE state_hash=?').bind(hash(state)).first();
    assert(flow);
    assert.equal(flow.browser_hash, hash(browser.value));
    assert.match(flow.code_verifier, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(redirect.searchParams.get('code_challenge'), createHash('sha256').update(flow.code_verifier).digest('base64url'));
    assert(flow.expires_at > Date.now());
    assert(flow.expires_at <= Date.now() + 600000);
    assert(!JSON.stringify(flow).includes(state));
    assert(!JSON.stringify(flow).includes(browser.value));
    return {state, browser, flow};
  }

  const flow = await begin();
  assert.equal(flow.flow.return_to, '/compare?lang=zh#matches');
  const statesBeforePrefetch = (await db.prepare('SELECT COUNT(*) AS n FROM oauth_states').first()).n;
  const prefetch = await fetch(origin + '/auth/signin', {headers: {Purpose: 'prefetch'}});
  assert.equal(prefetch.status, 204);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM oauth_states').first()).n, statesBeforePrefetch);
  const beforeInvalidCallbacks = await countSessions(db);
  const invalidCallbacks = [
    {state: randomBytes(32).toString('base64url'), cookie: flow.browser.pair},
    {state: flow.state},
    {state: flow.state, cookie: `orivex-oauth=${randomBytes(32).toString('base64url')}`},
    {state: 'malformed', cookie: flow.browser.pair},
    {cookie: flow.browser.pair},
  ];
  for (const invalid of invalidCallbacks) {
    const query = new URLSearchParams({code: 'test-code'});
    if (invalid.state) query.set('state', invalid.state);
    const response = await fetch(`${origin}/auth/callback?${query}`, {headers: invalid.cookie ? {Cookie: invalid.cookie} : {}});
    assert.equal(response.status, 400);
    assert.equal(await countSessions(db), beforeInvalidCallbacks);
    assert(!cookies(response).some(value => /^orivex-session=.+?;/.test(value)));
  }
  for (const query of [
    `state=${flow.state}&state=${flow.state}&code=test-code`,
    `state=${flow.state}&code=test-code&code=other-code`,
  ]) {
    const response = await fetch(`${origin}/auth/callback?${query}`, {headers: {Cookie: flow.browser.pair}});
    assert.equal(response.status, 400);
    assert.equal(await countSessions(db), beforeInvalidCallbacks);
  }
  // Failed callbacks must not consume the valid browser's outstanding login.
  assert(await db.prepare('SELECT state_hash FROM oauth_states WHERE state_hash=?').bind(hash(flow.state)).first());

  const expired = await begin('/');
  await db.prepare('UPDATE oauth_states SET expires_at=? WHERE state_hash=?').bind(Date.now() - 1, hash(expired.state)).run();
  const expiredCallback = await fetch(`${origin}/auth/callback?state=${expired.state}&code=test-code`, {headers: {Cookie: expired.browser.pair}});
  assert.equal(expiredCallback.status, 400);
  assert.equal(await countSessions(db), beforeInvalidCallbacks);

  // GitHub is mocked outside the application. The full callback still exchanges
  // a code, validates the provider identity and persists the real session hash.
  let exchangeBody;
  fetchMock.get('https://github.com').intercept({
    path: '/login/oauth/access_token', method: 'POST',
  }).reply(200, async options => {
    let serialized = '';
    if (typeof options.body === 'string' || options.body instanceof Uint8Array) {
      serialized = Buffer.from(options.body).toString('utf8');
    } else {
      for await (const chunk of options.body) serialized += Buffer.from(chunk).toString('utf8');
    }
    exchangeBody = new URLSearchParams(serialized);
    return {access_token: 'local-test-provider-token', token_type: 'bearer'};
  }, {headers: {'content-type': 'application/json'}});
  fetchMock.get('https://api.github.com').intercept({
    path: '/user', method: 'GET', headers: {authorization: 'Bearer local-test-provider-token'},
  }).reply(200, {
    id: 424242, login: 'test-github-user', name: 'PRIVATE GITHUB FULL NAME', email: 'private@example.invalid',
  }, {headers: {'content-type': 'application/json'}});
  const previous = await mintSession(db, 'test-member-previous');
  const beforeCallback = await countSessions(db);
  const completed = await fetch(`${origin}/auth/callback?state=${flow.state}&code=test-code`, {
    headers: {Cookie: `${flow.browser.pair}; ${previous.cookie}`},
  });
  assert.equal(completed.status, 303, JSON.stringify({
    response: await completed.clone().text(), exchangeObserved: !!exchangeBody,
    pending: fetchMock.pendingInterceptors().map(({origin, path, method}) => ({origin, path, method})),
  }));
  assert.equal(completed.headers.get('location'), '/compare?lang=zh#matches');
  assert.equal(exchangeBody.get('client_id'), 'test-client');
  assert.equal(exchangeBody.get('client_secret'), 'test-secret');
  assert.equal(exchangeBody.get('redirect_uri'), `${origin}/auth/callback`);
  assert.equal(exchangeBody.get('code'), 'test-code');
  assert.equal(exchangeBody.get('code_verifier'), flow.flow.code_verifier);
  fetchMock.assertNoPendingInterceptors();
  const signedIn = cookieValue(completed, 'orivex-session');
  assertCookie(signedIn.header);
  assert.match(signedIn.value, /^[A-Za-z0-9_-]{43}$/);
  assert.match(cookieValue(completed, 'orivex-oauth').header, /; Max-Age=0/);
  const session = await db.prepare('SELECT * FROM auth_sessions WHERE token_hash=?').bind(hash(signedIn.value)).first();
  assert(session);
  assert.equal(session.user_id, 'github:424242');
  assert.equal(session.display_name, 'test-github-user');
  assert(session.expires_at > Date.now());
  assert(session.expires_at <= Date.now() + 28800000);
  assert(!JSON.stringify(session).includes(signedIn.value));
  assert(!JSON.stringify(session).includes('local-test-provider-token'));
  assert(!JSON.stringify(session).includes('PRIVATE GITHUB FULL NAME'));
  assert.equal(await countSessions(db), beforeCallback);
  assert.equal(await db.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=?').bind(previous.hash).first(), null);
  assert.equal(await db.prepare('SELECT state_hash FROM oauth_states WHERE state_hash=?').bind(hash(flow.state)).first(), null);
  const replay = await fetch(`${origin}/auth/callback?state=${flow.state}&code=test-code`, {headers: {Cookie: flow.browser.pair}});
  assert.equal(replay.status, 400);
  assert.equal(await countSessions(db), beforeCallback);

  const game = {
    title: '仅本地 OAuth 测试 ' + Date.now(), developer: '虚构登录测试工作室',
    announced: '2026-08-01', published: '', source_url: 'https://example.invalid/oauth-test',
    description: '这条虚构游戏记录用于确认经过完整 GitHub 回调建立的会话可以提交内容。',
  };
  async function createGame(cookie, expected, worker = {fetch}, requestOrigin = origin) {
    const response = await worker.fetch(`${requestOrigin}/api/games`, {
      method: 'POST',
      headers: {Origin: requestOrigin, Cookie: cookie, 'Content-Type': 'application/json'},
      body: JSON.stringify(game),
    });
    assert.equal(response.status, expected, await response.clone().text());
    return response;
  }
  await createGame(signedIn.pair, 201);
  for (const site of [null, 'https://other.invalid']) {
    const response = await fetch(origin + '/auth/signout', {
      method: 'POST', headers: {Cookie: signedIn.pair, ...(site ? {Origin: site} : {})},
    });
    assert.equal(response.status, 403);
    assert(await db.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=?').bind(hash(signedIn.value)).first());
  }
  const signout = await fetch(origin + '/auth/signout', {method: 'POST', headers: {Origin: origin, Cookie: signedIn.pair}});
  assert.equal(signout.status, 303);
  assert.equal(signout.headers.get('location'), '/');
  assertCookie(cookieValue(signout, 'orivex-session').header);
  assert.match(cookieValue(signout, 'orivex-session').header, /; Max-Age=0/);
  assert.equal(await db.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=?').bind(hash(signedIn.value)).first(), null);
  await createGame(signedIn.pair, 401);

  const failedProvider = await begin('/');
  const beforeProviderFailure = await countSessions(db);
  fetchMock.get('https://github.com').intercept({path: '/login/oauth/access_token', method: 'POST'})
    .reply(400, {error: 'bad_verification_code'}, {headers: {'content-type': 'application/json'}});
  const rejectedProvider = await fetch(`${origin}/auth/callback?state=${failedProvider.state}&code=bad-code`, {
    headers: {Cookie: failedProvider.browser.pair},
  });
  assert.equal(rejectedProvider.status, 502);
  assert.equal(await countSessions(db), beforeProviderFailure);
  assert.equal(await db.prepare('SELECT state_hash FROM oauth_states WHERE state_hash=?').bind(hash(failedProvider.state)).first(), null);
  fetchMock.assertNoPendingInterceptors();

  for (const unsafe of [
    'https://other.invalid/path', '//other.invalid', '/\\other.invalid',
    '/%2fother.invalid', '/%5cother.invalid', '/auth/callback', '/safe\nLocation: other.invalid',
  ]) {
    assert.equal((await begin(unsafe)).flow.return_to, '/', `Unsafe return path accepted: ${JSON.stringify(unsafe)}`);
  }
  assert.equal((await begin('/submit?lang=en#form')).flow.return_to, '/submit?lang=en#form');

  // A deployment without its GitHub secret remains closed even when a cookie
  // has a matching database record or a caller supplies old identity headers.
  const secureOrigin = 'https://orivex.example';
  const unconfigured = await createWorker({AUTH_ORIGIN: secureOrigin, AUTH_GITHUB_CLIENT_ID: 'test-client'});
  const unconfiguredSession = await mintSession(unconfigured.db, 'test-member-unconfigured');
  const missingConfig = await unconfigured.fetch(secureOrigin + '/auth/signin');
  assert.equal(missingConfig.status, 503);
  const closed = await unconfigured.fetch(secureOrigin + '/api/games', {
    method: 'POST',
    headers: {
      Origin: secureOrigin, Cookie: `__Host-orivex-session=${unconfiguredSession.token}`,
      'Content-Type': 'application/json', 'oai-authenticated-user-id': 'forged-user',
    },
    body: JSON.stringify(game),
  });
  assert.equal(closed.status, 401);
  assert.equal((await unconfigured.fetch(secureOrigin + '/api/games')).status, 200);

  const secure = await createWorker({
    AUTH_ORIGIN: secureOrigin, AUTH_GITHUB_CLIENT_ID: 'test-client', AUTH_GITHUB_CLIENT_SECRET: 'test-secret',
  });
  const secureSignIn = await secure.fetch(secureOrigin + '/auth/signin');
  assert.equal(secureSignIn.status, 302);
  assertCookie(cookieValue(secureSignIn, '__Host-orivex-oauth').header, true);
  const secureSession = await mintSession(secure.db, 'test-member-secure');
  await createGame(secureSession.cookie, 401, secure, secureOrigin);
  await createGame(`__Host-orivex-session=${secureSession.token}`, 201, secure, secureOrigin);
  const secureSignout = await secure.fetch(secureOrigin + '/auth/signout', {
    method: 'POST', headers: {Origin: secureOrigin, Cookie: `__Host-orivex-session=${secureSession.token}`},
  });
  assert.equal(secureSignout.status, 303);
  assertCookie(cookieValue(secureSignout, '__Host-orivex-session').header, true);
  assert.equal(await secure.db.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=?').bind(secureSession.hash).first(), null);

  return {
    oauthStateAndPkce: true, invalidOAuthStateRejected: true, browserBoundOAuthState: true,
    expiredOAuthStateRejected: true, githubCallbackSession: true, oauthReplayRejected: true,
    loginRotatesSession: true, providerErrorFailsClosed: true, authPrefetchHasNoSideEffects: true,
    signoutOriginProtection: true, signoutRevokesSession: true,
    openRedirectRejected: true, missingProductionAuthFailsClosed: true, secureCookiePrefix: true,
  };
}
