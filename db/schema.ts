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
