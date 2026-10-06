import assert from 'node:assert/strict';

export async function runApiScenarios({fetch, db, origin, mintSession}) {
  const alice = 'test-member-alice', bob = 'test-member-bob', carol = 'test-member-carol';
  const sessions = new Map();
  for (const user of [alice, bob, carol]) sessions.set(user, await mintSession(db, user));
  const spoofedHeaders = {
    'oai-authenticated-user-id': alice,
    'oai-authenticated-user-email': `${alice}@example.invalid`,
    'oai-authenticated-user-full-name': 'PRIVATE FULL NAME',
  };

  async function post(path, body, user, expected = 201, site = origin, extraHeaders = {}) {
    const response = await fetch(origin + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Connection: 'close',
        ...(site ? {Origin: site} : {}),
        ...(user ? {Cookie: sessions.get(user).cookie} : {}),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let data;
    try {data = JSON.parse(raw);} catch {throw new Error(`Unexpected response ${response.status}: ${raw}`);}
    assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
    return data;
  }

  const game = {
    title: '仅本地测试 A ' + Date.now(),
    developer: '虚构测试工作室',
    published: '2026-10-01',
    announced: '2026-08-01',
    source_url: 'https://example.invalid/test',
    description: '测试作品描述：在虚构海岛种植作物、探索场景并通过季节变化解锁新的内容。',
  };
  for (const [cookie, expected] of [['', 'Please sign in before submitting.'], ['orivex-locale=zh', '请先登录后再提交。']]) {
    const response = await fetch(origin + '/api/games', {
      method: 'POST',
      headers: {Origin: origin, 'Content-Type': 'application/json', 'Accept-Language': 'en-US', Cookie: cookie},
      body: JSON.stringify(game),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, expected);
  }
  await post('/api/games', game, null, 401);
  await post('/api/games', game, null, 401, origin, spoofedHeaders);
  await post('/api/games', game, alice, 403, 'https://other.invalid');
  await post('/api/games', game, alice, 403, null);
  await post('/api/games', {...game, published: '2026-02-30'}, alice, 400);

  const expired = await mintSession(db, 'test-member-expired', {expiresAt: Date.now() - 1});
  const revoked = await mintSession(db, 'test-member-revoked');
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(revoked.hash).run();
  const token = sessions.get(alice).token;
  const tampered = `orivex-session=${token[0] === 'A' ? 'B' : 'A'}${token.slice(1)}`;
  for (const cookie of [expired.cookie, revoked.cookie, tampered, 'orivex-session=invalid', `${sessions.get(alice).cookie}; ${sessions.get(alice).cookie}`]) {
    await post('/api/games', game, null, 401, origin, {Cookie: cookie, ...spoofedHeaders});
  }

  const a = await post('/api/games', game, alice);
  // Forged platform headers cannot override the identity in a valid session.
  const b = await post('/api/games', {...game, title: game.title + ' B'}, bob, 201, origin, spoofedHeaders);
  const record = await db.prepare('SELECT created_by FROM games WHERE id=?').bind(b.id).first();
  assert.equal(record.created_by, bob);
  await post('/api/games', game, alice, 409);

  const image = 'data:image/jpeg;base64,/9j/';
  const report = {
    version: '1.0',
    model: 'transformers.js 3.8.1 / CLIP ViT-B32 / multilingual MiniLM-L12',
    generated_at: new Date().toISOString(),
    texts: {a: game.description, b: game.description},
    idea_similarity: 1,
    video_similarity: 1,
    coverage: {
      samples: 12, a_duration: 2, b_duration: 2, a_hash: 'a'.repeat(64), b_hash: 'b'.repeat(64),
      a_frame_count: 12, b_frame_count: 12, audio_processed: false,
    },
    matches: [{similarity: 1, a: {time: .2}, b: {time: .2}}],
    limitations: ['本地测试，不代表真实游戏。'],
  };
  const payload = {
    a_id: a.id, b_id: b.id, share_permission: true,
    note: '这是一条只存在于本地测试数据库的合成证据，用于验证共享与审核权限。', analysis: report,
  };
  await post('/api/comparisons', payload, null, 401, origin, spoofedHeaders);
  await post('/api/comparisons', {
    ...payload,
    analysis: {
      ...report, idea_similarity: null, video_similarity: null, matches: [],
      coverage: {
        ...report.coverage, samples: 0, a_frame_count: 0, b_frame_count: 0,
        a_duration: 0, b_duration: 0, a_hash: null, b_hash: null,
      },
    },
  }, alice, 400);
  await post('/api/comparisons', {
    ...payload,
    analysis: {...report, matches: [{similarity: 1, a: {time: .2, image: 'data:image/jpeg;base64,/9j/'}, b: {time: .2, image}}]},
  }, alice, 400);
  const beforeRejected = (await db.prepare('SELECT COUNT(*) AS n FROM comparisons').first()).n;
  await post('/api/comparisons', {...payload, analysis: {...report, coverage: {...report.coverage, image}}}, alice, 400);
  await post('/api/comparisons', {...payload, analysis: {...report, matches: [{similarity: 1, a: {time: .2, image}, b: {time: .2, image}}]}}, alice, 400);
  await post('/api/comparisons', {...payload, analysis: {...report, matches: [{similarity: 1, a: {time: .2, image: 'data:image/jpeg;base64,' + 'A'.repeat(25000)}, b: {time: .2}}]}}, alice, 413);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM comparisons').first()).n, beforeRejected);
  const textOnly = await post('/api/comparisons', {...payload, analysis: {...report, video_similarity: null, matches: [], coverage: {...report.coverage, samples: 0, a_frame_count: 0, b_frame_count: 0, a_duration: 0, b_duration: 0, a_hash: null, b_hash: null}}}, alice);
  assert(textOnly.id);
  const comparison = await post('/api/comparisons', payload, alice);
  const review = {
    kind: 'review', comparison_id: comparison.id, verdict: 'similar',
    reason: '测试审核意见：确认这是用于本地验证的合成内容，并不涉及任何真实作品。',
  };
  await post('/api/reviews', review, null, 401, origin, spoofedHeaders);
  await post('/api/reviews', review, alice, 403);
  await post('/api/reviews', review, bob);
  await post('/api/reviews', {...review, verdict: 'unclear', reason: review.reason + '修订一次以保留历史。'}, bob);
  await post('/api/reviews', {...review, verdict: 'different'}, carol);
  await post('/api/reviews', {
    kind: 'response', comparison_id: comparison.id,
    body: '测试作者回应：提供额外说明以验证回应与申诉流程可以由作者参与。',
    source_url: 'https://example.invalid/evidence',
  }, alice);

  const data = await (await fetch(origin + '/api/reviews?id=' + comparison.id, {headers: {Connection: 'close'}})).json();
  assert.equal(data.reviews.length, 2);
  assert.equal(data.history.length, 3);
  assert.equal(data.responses.length, 1);
  assert(!JSON.stringify(data).includes('PRIVATE FULL NAME'));
  const listing = await (await fetch(origin + '/api/comparisons', {headers: {Connection: 'close'}})).json();
  const shared = listing.comparisons.find(value => value.id === comparison.id);
  assert(shared);
  assert(!JSON.stringify(shared).includes('author_id'));
  assert(!JSON.stringify(shared).includes('PRIVATE FULL NAME'));
  assert(!JSON.stringify(shared.analysis).includes('image'));
  const stored = await db.prepare('SELECT analysis FROM comparisons WHERE id=?').bind(comparison.id).first();
  assert(!stored.analysis.includes('image'));
  assert(!stored.analysis.includes('data:'));
  assert(stored.analysis.length < 20000);
  // Historical image references must not become an upload or image-serving path.
  await db.prepare('UPDATE comparisons SET analysis=? WHERE id=?').bind(JSON.stringify({...report, matches: [{similarity: 1, a: {time: .2, image: '/api/evidence/old/0-a'}, b: {time: .2, image}}]}), comparison.id).run();
  const legacy = await (await fetch(origin + '/api/comparisons')).json();
  assert(!JSON.stringify(legacy).includes('image'));
  const evidence = await fetch(origin + '/api/evidence/' + comparison.id + '/0-a');
  assert.equal(evidence.status, 404);
  return {
    authentication: true, forgedIdentityHeadersRejected: true, sessionIdentityAuthoritative: true,
    expiredSessionRejected: true, revokedSessionRejected: true, tamperedSessionRejected: true,
    crossOriginRejected: true, missingOriginRejected: true, invalidDateRejected: true,
    duplicateRejected: true, emptyReportRejected: true, imagePayloadRejected: true, oversizedPayloadRejected: true, textOnlyPublishing: true,
    sharedPersistence: true, selfReviewRejected: true, uniqueReviews: true,
    revisionHistory: true, authorResponse: true, publicPseudonyms: true, noR2Required: true, noStoredImages: true, legacyImagesHidden: true, evidenceEndpointRemoved: true,
  };
}
