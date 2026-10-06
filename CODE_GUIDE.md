# Orivex code guide

This guide uses simple English. The main app files also have short English comments.

## If you come from a game engine

| Web concept         | Similar idea in a game engine                     |
| ------------------- | ------------------------------------------------- |
| React component     | A reusable UI panel                               |
| JSX                 | UI elements written inside a code file            |
| React state         | Data that controls the current screen             |
| `setSomething(...)` | Change screen data and redraw the UI              |
| `useEffect(...)`    | Run work when a screen opens or its inputs change |
| `fetch(...)`        | Send a request to a server                        |
| API route           | A server function that handles a request          |
| D1                  | The shared database, hosted by Cloudflare         |
| Web Worker          | A background task on the visitor's device         |
| TypeScript type     | A description of the data a function expects      |
| Zod schema          | A check of the actual input received at runtime   |

A TypeScript type helps while writing code. It does not stop a user from sending bad data. The server uses Zod and other checks for that.

## Start reading here

1. `app/page.tsx` reads the current login session.
2. `app/workspace.tsx` shows the game list and main tabs.
   `app/archive.tsx` shows one game’s stories, sources, fan works, and support links.
3. `app/compare.tsx` compares descriptions and videos.
4. `app/reviews.tsx` shows reports, reviews, and responses.
5. `app/api/` handles shared data on the server.

The browser shows the interface. The server checks login and saves shared records.

## File map

| File                       | Main job                                                                 |
| -------------------------- | ------------------------------------------------------------------------ |
| `app/layout.tsx`           | Page title, language, and shared layout                                  |
| `app/globals.css`          | Colors, spacing, dialogs, and mobile layout                              |
| `app/workspace.tsx`        | Game list, search, registration form, and tabs                           |
| `app/archive.tsx`          | A shareable game archive and its record forms                            |
| `app/api/archive/route.ts` | Read, add, correct, withdraw, and check archive records                  |
| `lib/archive.ts`           | Record types, input checks, and shared labels                            |
| `app/compare.tsx`          | Analysis controls, frame matching, and report publishing                 |
| `app/reviews.tsx`          | Review cards, votes, responses, and change history                       |
| `lib/video.ts`             | Local video decoding, frame sampling, file hashes, and vector comparison |
| `public/ai-worker.js`      | Model download and local model work                                      |
| `lib/report.ts`            | Local and public report formats                                          |
| `lib/auth.ts`              | GitHub login and site sessions                                           |
| `lib/server.ts`            | Database access, login checks, input limits, and API errors              |
| `lib/client.ts`            | Read API results and show useful errors                                  |
| `lib/messages.ts`          | English translations for Chinese UI text                                 |
| `lib/i18n.tsx`             | Language state and the language switch                                   |
| `lib/locale-server.ts`     | Choose the language for server messages                                  |
| `lib/webmcp.ts`            | Optional browser tools; they cannot publish records                      |
| `db/schema.ts`             | Table definitions and indexes                                            |
| `drizzle/`                 | Database migration files                                                 |
| `wrangler.jsonc`           | Cloudflare Worker name, bindings, and public settings                    |
| `vite.config.ts`           | Build setup                                                              |
| `scripts/start-local.mjs`  | Run a built Worker on the local computer                                 |

## Register a game

```text
Registration form
  -> POST /api/games
  -> Check the site origin and login session
  -> Check fields, dates, duplicate records, and the account limit
  -> Save the game and its first timeline sources in D1
  -> Refresh the game list
```

`GET` reads records. `POST` submits data. SQL values are passed through `.bind(...)` instead of being added to the SQL string.

## Game archives

The URL `/?game=<game ID>` opens a public game archive. Anyone can read it. A signed-in member can add a story, a dated source, a fan work, or a support link.

Each record has its original source link. Stories and fan works also name their creators. Adding a credit does not verify that someone is the creator.

Fan works can link to several games. Games with the same series name share the fan section. Support links open external pages; Orivex does not handle payments.

Source votes check whether a link supports a date. One account has one current opinion per record version. The submitter cannot check their own record. The earlier-source sort uses submitted source dates, which can still need checking.

Only the original submitter can correct or withdraw their record. A correction creates a new version and keeps the old version and its votes. The new version starts with no votes. A withdrawn record is hidden from public browsing.

The server checks the expected version again while writing. This prevents an old form from overwriting a newer correction.

Each account can make up to 120 archive writes in the last 24 hours. This includes edits and votes. It is a per-account limit, not a total hosting cost limit.

`0003_creator_archives.sql` creates the archive tables and copies old game registration sources into them. Apply this migration before deploying the archive code.

Cloudflare dashboard login settings are kept during deployment with `keep_vars`. Local login settings belong in `.dev.vars`; see `.dev.vars.example`.

## Compare videos

```text
Local video files
  -> lib/video.ts reads the files and samples frames
  -> public/ai-worker.js turns frames and text into number lists
  -> app/compare.tsx compares those lists
  -> Show a local report
```

A number list from a model is called a vector. `cosine(...)` compares the directions of two vectors. Its score ranges from -1 to 1. It is not a probability of copying.

The video score averages best frame matches in both directions. This does not check full shot order or audio. More than one frame can match the same frame in the other video.

The report shows up to six close frame pairs. Its file hash identifies the file bytes, not the creator.

## Publish a report

`Report` is the local format. It can contain JPEG frames.

`PublishedReport` is the public format. It contains text, scores, sample times, file hashes, and limits of the analysis.

`toPublishedReport(...)` removes images before publishing. The server also rejects image fields. Original videos and sampled images are not saved to D1 or R2.

The browser creates the scores. Saving a report does not verify those scores independently.

## GitHub login

```text
/auth/signin
  -> Save a short login attempt and set a browser cookie
  -> Send the browser to GitHub
GitHub authorization
  -> Return to /auth/callback
  -> Check the attempt and browser cookie
  -> Exchange the code for a GitHub token on the server
  -> Read the public GitHub ID and login name
  -> Create an Orivex session
```

The GitHub token is not saved. Orivex creates its own random session token. The browser gets the token in an HttpOnly cookie. D1 stores only its hash and expiry time.

`POST /auth/signout` removes the current server session and clears the cookies.

## Reviews and responses

A report author cannot review their own report. Each account has one current review per report. Editing it also adds a record to `review_history`.

A response is a separate explanation or source link. It does not count as a vote. The UI agreement label needs at least two matching votes and no opposing vote.

## Common edits

- Change interface text in the screen file, then add its English translation in `lib/messages.ts`.
- Change colors and layout in `app/globals.css`.
- Change input limits in both the form and its API schema.
- Change the local/public report format in `lib/report.ts`, then update the code that builds and displays it.
- Change tables in `db/schema.ts`, then generate and inspect a new migration.

The common UI components in `components/ui/` and the hosting helpers in `build/` are separate from the main app logic. Third-party licenses stay with their code.

## Before pushing a deployment

Check that `AUTH_ORIGIN` and `AUTH_GITHUB_CLIENT_ID` in `wrangler.jsonc` match the production runtime settings. A dashboard edit alone can be replaced by a later deployment from this file.

Keep `AUTH_GITHUB_CLIENT_SECRET` in Cloudflare Runtime secrets. Never put it in source code, a public screenshot, or a commit. Local credentials belong in the ignored `.dev.vars` file.

Run these checks from the project folder:

```sh
npx tsc --noEmit
npm run build
npm run verify:api
```

The API checks use a temporary local database and mock GitHub replies. They do not change the production database.
