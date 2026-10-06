import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Use real request checks with synthetic sessions in an isolated test database.
export async function runArchiveScenarios({ createWorker, origin, mintSession }) {
  const { fetch, db } = await createWorker(undefined, true);
  const alice = await mintSession(db, 'archive-alice');
  const bob = await mintSession(db, 'archive-bob');
  async function write(
    body,
    session = alice,
    status = 201,
    method = 'POST',
    site = origin,
    path = '/api/archive',
  ) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: site,
        ...(session ? { Cookie: session.cookie } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  async function read(game, session) {
    const response = await fetch(origin + '/api/archive?game_id=' + game, {
      headers: session ? { Cookie: session.cookie } : {},
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const legacy = await db.prepare("SELECT id FROM games WHERE title='Legacy test'").first();
  const migrated = await read(legacy.id);
  assert.equal(migrated.items.length, 2);
  assert(migrated.items.some((item) => item.occurred_on === '2025-01-01'));
  const migratedHistory = await (
    await fetch(origin + '/api/archive?item_id=' + migrated.items[0].id)
  ).json();
  assert.equal(migratedHistory.history.length, 1);

  const game = {
    title: 'Archive test A',
    developer: 'Synthetic studio',
    published: '',
    announced: '2026-01-01',
    source_url: 'https://example.invalid/reveal',
    description: 'A synthetic game made only to test the creation archive.',
    series: 'Test series',
  };
  const a = (await write(game, alice, 201, 'POST', origin, '/api/games')).id;
  const b = (
    await write(
      { ...game, title: 'Archive test B', series: '' },
      alice,
      201,
      'POST',
      origin,
      '/api/games',
    )
  ).id;
  const c = (
    await write({ ...game, title: 'Archive test C' }, bob, 201, 'POST', origin, '/api/games')
  ).id;
  const other = (
    await write(
      { ...game, title: 'Unrelated game', series: '' },
      bob,
      201,
      'POST',
      origin,
      '/api/games',
    )
  ).id;
  const auto = (await read(a)).items[0];
  assert.equal(auto.kind, 'evidence');
  const story = {
    kind: 'story',
    game_id: a,
    title: 'How the idea changed',
    body: 'The creator explains how the first idea changed during development.',
    credit: 'Story author',
    url: 'https://example.invalid/story',
  };
  await write(story, null, 401);
  await write(story, alice, 403, 'POST', 'https://other.invalid');
  for (const bad of [
    { ...story, url: 'javascript:alert(1)' },
    { ...story, url: 'https://user:password@example.invalid/' },
    { ...story, credit: '' },
    { ...story, image: 'data:image/png;base64,abc' },
  ])
    await write(bad, alice, 400);
  const storyId = (await write(story)).id;
  await write(story, alice, 409);
  const source = {
    kind: 'evidence',
    game_id: a,
    title: 'First public idea',
    body: 'This public post shows the idea and the date people can check.',
    url: 'https://example.invalid/idea',
    category: 'idea',
    occurred_on: '2025-08-01',
  };
  await write({ ...source, occurred_on: '2025-02-30' }, alice, 400);
  const sourceId = (await write(source)).id;
  const vote = {
    kind: 'vote',
    id: sourceId,
    revision: 1,
    verdict: 'supports',
    reason: 'The linked post shows this exact date.',
  };
  await write(vote, alice, 403);
  await write({ ...vote, id: storyId }, bob, 404);
  await write(vote, bob);
  await write(
    { ...vote, verdict: 'unclear', reason: 'The timestamp needs another independent source.' },
    bob,
  );
  let current = (await read(a, bob)).items.find((item) => item.id === sourceId);
  assert.deepEqual(current.votes, { supports: 0, unclear: 1, disputes: 0 });
  assert.equal(current.my_vote, 'unclear');
  assert.equal(current.can_edit, false);
  assert.equal((await read(a, alice)).items.find((item) => item.id === sourceId).can_edit, true);
  const edit = {
    id: sourceId,
    revision: 1,
    reason: 'Corrected the date after reading the original post.',
    item: { ...source, occurred_on: '2025-07-01' },
  };
  await write(edit, bob, 403, 'PATCH');
  await write({ ...edit, item: { ...edit.item, game_id: b } }, alice, 400, 'PATCH');
  await write(edit, alice, 200, 'PATCH');
  await write(edit, alice, 409, 'PATCH');
  await write(vote, bob, 409);
  current = (await read(a, bob)).items.find((item) => item.id === sourceId);
  assert.equal(current.revision, 2);
  assert.deepEqual(current.votes, { supports: 0, unclear: 0, disputes: 0 });
  await write({ ...vote, revision: 2 }, bob);
  const history = await (await fetch(origin + '/api/archive?item_id=' + sourceId)).json();
  assert.deepEqual(
    history.history.map((entry) => entry.revision),
    [2, 1],
  );
  assert.equal(history.history[1].snapshot.occurred_on, '2025-08-01');
  assert.equal(history.votes.length, 2);
  assert(!JSON.stringify(history).includes('archive-bob'));
  const publicList = await read(a);
  assert(!JSON.stringify(publicList).includes('author_id'));
  assert(!JSON.stringify(publicList).includes('PRIVATE FULL NAME'));
  assert(publicList.items.every((item) => !item.can_edit && !item.my_vote));
  const listing = await (await fetch(origin + '/api/games')).json();
  assert.equal(listing.games.find((g) => g.id === a).earliest_public, '2025-07-01');
  const fan = {
    kind: 'fan',
    game_id: a,
    title: 'Fan illustration',
    body: 'A fan illustration made by its own artist.',
    credit: 'Fan artist',
    url: 'https://example.invalid/fan',
    category: 'art',
    related_game_ids: [b],
  };
  await write({ ...fan, related_game_ids: [randomUUID()] }, alice, 400);
  const fanId = (await write(fan)).id;
  assert((await read(b)).items.some((item) => item.id === fanId));
  assert((await read(c)).items.some((item) => item.id === fanId));
  assert(!(await read(other)).items.some((item) => item.id === fanId));
  await write(
    {
      id: fanId,
      revision: 1,
      reason: 'This fan work only relates to the first game.',
      item: { ...fan, related_game_ids: [] },
    },
    alice,
    200,
    'PATCH',
  );
  assert(!(await read(b)).items.some((item) => item.id === fanId));
  assert((await read(c)).items.some((item) => item.id === fanId));
  const support = {
    kind: 'support',
    game_id: a,
    title: 'Wishlist the game',
    url: 'https://example.invalid/store',
    category: 'store',
  };
  const supportId = (await write(support)).id;
  await write({ id: supportId, revision: 1 }, bob, 409, 'DELETE');
  await write({ id: supportId, revision: 1 }, alice, 200, 'DELETE');
  assert(!(await read(a)).items.some((item) => item.id === supportId));
  assert.equal((await fetch(origin + '/api/archive?item_id=' + supportId)).status, 404);
  assert.equal(
    (
      await db
        .prepare('SELECT COUNT(*) AS n FROM archive_revisions WHERE item_id=?')
        .bind(supportId)
        .first()
    ).n,
    1,
  );
  const limited = await mintSession(db, 'archive-limited');
  await db.batch(
    Array.from({ length: 120 }, () =>
      db
        .prepare('INSERT INTO archive_activity (id,user_id,created_at) VALUES (?,?,?)')
        .bind(randomUUID(), 'archive-limited', new Date().toISOString()),
    ),
  );
  await write({ ...story, url: 'https://example.invalid/limited' }, limited, 429);
  return {
    legacyArchiveMigration: true,
    creationStories: true,
    archiveWriteAuthentication: true,
    archiveOriginCheck: true,
    unsafeArchiveUrlsRejected: true,
    archiveDatesValidated: true,
    archiveSelfVotesRejected: true,
    oneVotePerVersion: true,
    staleVoteRejected: true,
    correctionHistory: true,
    oldVotesPreserved: true,
    correctedVotesReset: true,
    fanGameAndSeriesLinks: true,
    fanRelationsEditable: true,
    publicArchivePrivacy: true,
    sourceDateSorting: true,
    withdrawalPermissions: true,
    archiveDailyLimit: true,
  };
}
