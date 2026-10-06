import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
// Public game dates and their source links.
export const games = sqliteTable(
  'games',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    developer: text('developer').notNull(),
    published: text('published').notNull().default(''),
    announced: text('announced').notNull().default(''),
    sourceUrl: text('source_url').notNull(),
    description: text('description').notNull(),
    series: text('series').notNull().default(''),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('game_title_source').on(t.title, t.sourceUrl),
    index('games_created').on(t.createdAt),
  ],
);
// One report compares two registered games. Analysis is stored as JSON text.
export const comparisons = sqliteTable(
  'comparisons',
  {
    id: text('id').primaryKey(),
    aId: text('a_id')
      .notNull()
      .references(() => games.id),
    bId: text('b_id')
      .notNull()
      .references(() => games.id),
    authorId: text('author_id').notNull(),
    authorName: text('author_name').notNull(),
    note: text('note').notNull(),
    analysis: text('analysis').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('comparison_created').on(t.createdAt),
    index('comparison_author_time').on(t.authorId, t.createdAt),
  ],
);
// Keep one current review per account and report.
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    comparisonId: text('comparison_id')
      .notNull()
      .references(() => comparisons.id),
    userId: text('user_id').notNull(),
    displayName: text('display_name').notNull(),
    verdict: text('verdict').notNull(),
    reason: text('reason').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('one_review_per_account').on(t.comparisonId, t.userId)],
);
// Keep past review edits so readers can check how an opinion changed.
export const reviewHistory = sqliteTable(
  'review_history',
  {
    id: text('id').primaryKey(),
    comparisonId: text('comparison_id')
      .notNull()
      .references(() => comparisons.id),
    userId: text('user_id').notNull(),
    displayName: text('display_name').notNull(),
    verdict: text('verdict').notNull(),
    reason: text('reason').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('history_comparison_time').on(t.comparisonId, t.createdAt),
    index('history_user_time').on(t.userId, t.createdAt),
  ],
);
// Responses add explanations or evidence without replacing reviews.
export const responses = sqliteTable(
  'responses',
  {
    id: text('id').primaryKey(),
    comparisonId: text('comparison_id')
      .notNull()
      .references(() => comparisons.id),
    userId: text('user_id').notNull(),
    displayName: text('display_name').notNull(),
    body: text('body').notNull(),
    sourceUrl: text('source_url').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('response_comparison_time').on(t.comparisonId, t.createdAt)],
);
// Store only session token hashes. Expiry times use milliseconds.
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull(),
    displayName: text('display_name').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('auth_sessions_expiry').on(t.expiresAt)],
);
// Short-lived login attempts bind the callback to the browser that started it.
export const oauthStates = sqliteTable(
  'oauth_states',
  {
    stateHash: text('state_hash').primaryKey(),
    browserHash: text('browser_hash').notNull(),
    codeVerifier: text('code_verifier').notNull(),
    returnTo: text('return_to').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('oauth_states_expiry').on(t.expiresAt)],
);

// Each item belongs to a game. Fan works can also link to other games.
export const archiveItems = sqliteTable(
  'archive_items',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    url: text('url').notNull(),
    credit: text('credit').notNull().default(''),
    category: text('category').notNull().default(''),
    occurredOn: text('occurred_on').notNull().default(''),
    authorId: text('author_id').notNull(),
    authorName: text('author_name').notNull(),
    revision: integer('revision').notNull().default(1),
    removed: integer('removed').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('archive_game_kind').on(table.gameId, table.kind, table.createdAt)],
);

export const archiveRelatedGames = sqliteTable(
  'archive_related_games',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => archiveItems.id),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id),
  },
  (table) => [
    uniqueIndex('archive_related_unique').on(table.itemId, table.gameId),
    index('archive_related_game').on(table.gameId),
  ],
);

// Votes apply to a specific revision, so an edited date needs new checks.
export const archiveVotes = sqliteTable(
  'archive_votes',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => archiveItems.id),
    revision: integer('revision').notNull(),
    userId: text('user_id').notNull(),
    displayName: text('display_name').notNull(),
    verdict: text('verdict').notNull(),
    reason: text('reason').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('archive_vote_unique').on(table.itemId, table.revision, table.userId)],
);

// Public snapshots omit account IDs and keep past corrections readable.
export const archiveRevisions = sqliteTable(
  'archive_revisions',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => archiveItems.id),
    revision: integer('revision').notNull(),
    snapshot: text('snapshot').notNull(),
    reason: text('reason').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('archive_revision_unique').on(table.itemId, table.revision)],
);

// Count every write, including repeated edits and vote changes.
export const archiveActivity = sqliteTable(
  'archive_activity',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('archive_activity_user_time').on(table.userId, table.createdAt)],
);
