# Orivex

[中文文档](README.md)

New to web code? Start with the [code guide in simple English](CODE_GUIDE.md).

An MIT-licensed game evidence registry. Anyone can browse publicly. Sign in with GitHub to register games, submit comparisons, review evidence, and respond.

## Features

- English and Chinese interfaces. The first visit follows the request's preferred language; the language switch stores your choice for one year. Switching preserves current drafts and reports. Creator-submitted content stays in its original language.
- Game announcement and release dates, source URLs, and creative descriptions. Dates are marked as submitter-provided and unverified.
- Two complete MP4 / WebM videos decoded locally in the browser, with 12 or 24 evenly spaced frame samples per video. Each file may be up to 100 MB and 10 minutes. Flat-color frames are excluded.
- CLIP ViT-B32 visual embeddings and multilingual MiniLM text embeddings run in a browser Worker. No API key is required. The first run downloads models. Input text and original videos are not sent to a model service.
- Cosine similarity, six closest frame pairs, timestamps, SHA-256 fingerprints, actual compared text, coverage, and limitations. Only the first 800 characters of each description are used; model tokenization may truncate them further.
- Published text, scores, sample times, and file fingerprints persist in D1. Videos and sampled images stay on the user’s device; local report exports can still include images.
- Independent account reviews, no self-review, one current opinion per account per comparison, revision history, responses, and additional sources.
- Server-side identity, origin, length, calendar date, URL, and metadata validation. Image payloads are rejected. Rolling 24-hour submission limits.

## Images and billing scope

This version has no R2 binding or image/video upload endpoint. Published reports contain only text and analysis metadata. Publishing requests are capped at 20,000 bytes and reject image fields. Scores are generated on the user’s device; reviewers need the original videos to check visuals. Historical image references are also omitted from public listings.

Keep the Cloudflare Workers Free plan and do not enable paid services. D1 Free rejects queries when daily read/write limits are reached and blocks new data at the storage limit. Workers Free rejects requests above its daily request limit. Abuse may make the site unavailable temporarily. Source configuration cannot lock your account’s billing plan; upgrading to Paid changes billing behavior. See [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## Understanding the results

Similarity is not a calibrated plagiarism probability. The models cannot establish copying, infringement, or AI use. Shared genres, licensed assets, similar composition, and independent creation can produce high scores. Video comparison averages the best frame matches in both directions. It does not process audio, complete shot order, code, or unsampled scenes.

Reports are generated in the submitter's browser and may be fabricated by a malicious submitter. They remain unverified until independently checked. Two agreeing accounts do not establish that they belong to distinct people. This first version does not include an administrator identity-verification or complaint-removal dashboard.

Model downloads can be large; network and device memory limits may cause failures. Failures are displayed explicitly, without substitute scores. Model weights currently use the main branch: pin weight revisions separately to reproduce historical inference exactly.

The registry displays the latest 200 games and the review list the latest 100 comparisons; older records remain stored. The MIT license applies to source code, not to creator-submitted game materials or video frames. The source download includes no live data, secrets, or hosted project identity.

## Run locally

Vinext, React, and TypeScript on Cloudflare Workers, with D1 only; R2 is not used. Requires Node 22.13 or later.

```sh
npm ci
npm run build
```

The root `wrangler.jsonc` points `migrations_dir` to `drizzle/`. Initialize the local database with every SQL migration there, including the `auth_sessions` and `oauth_states` tables in `0002_github_auth.sql`:

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc --persist-to .wrangler/state
```

Copy the local variable example. The following command uses PowerShell:

```powershell
Copy-Item -LiteralPath .dev.vars.example -Destination .dev.vars
```

Wrangler applies migrations in order and records completed files; use the same command for later migrations. If an older database was migrated manually with `d1 execute --file`, reconcile its migration records before rerunning SQL that creates existing tables. After editing `db/schema.ts`, generate and inspect new migrations with `npm run db:generate`.

## Configure GitHub sign-in

Create an OAuth App in GitHub's developer settings. Set Homepage URL to the site's URL and Authorization callback URL to `AUTH_ORIGIN/auth/callback`; for example, `http://127.0.0.1:5173/auth/callback` locally. Separate OAuth Apps are recommended for development and production. See [GitHub's OAuth App setup guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

Set these three Cloudflare Worker runtime variables in `.dev.vars` at the project root:

| Variable | Value |
| --- | --- |
| `AUTH_ORIGIN` | The origin used to access the site, such as `http://127.0.0.1:5173`, without a path |
| `AUTH_GITHUB_CLIENT_ID` | Your GitHub OAuth App's Client ID |
| `AUTH_GITHUB_CLIENT_SECRET` | Your GitHub OAuth App's Client Secret, kept only in a private local file or a production secret |

After filling in the values, run the following command and open `http://127.0.0.1:5173`:

```sh
npm run dev
```

`npm run dev` defaults to `5173`; the local built Worker started with `npm start` defaults to `8787`. `AUTH_ORIGIN`, the browser address, and the OAuth App callback must use the same host and port. Do not mix `localhost` and `127.0.0.1`. Update the `.dev.vars` origin and GitHub callback when switching to `npm start` or choosing another port. For example, `npm start` needs `AUTH_ORIGIN=http://127.0.0.1:8787` and callback `http://127.0.0.1:8787/auth/callback`. Leave the credentials blank for public browsing only; a missing sign-in variable causes authentication and writes to fail closed.

The app uses only GitHub's public numeric ID and login name. It requests no email or repository permissions and does not store OAuth access tokens. Revocable sessions are stored in D1 and expire after eight hours. Signing out revokes the current session, and each write API validates the session again. See [GitHub's OAuth scope reference](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).

## Self-hosting

`.orivex/hosting.json` is this fork's configuration and declares only the logical `DB` binding. The directory was renamed from `.openai` to `.orivex`; it is not directly compatible with the original Sites deployment flow. The root `wrangler.jsonc` provides a Cloudflare Workers self-hosting configuration. Bind your own D1 database for production and verify its UUID. Do not subscribe to R2 for this version. The source does not inherit the original site's database, sign-in authorization, or hosted project identity.

If you have not created a database yet, create D1 and set its returned `database_id` in `wrangler.jsonc`. Do not create another database if `orivex-db` already exists:

```sh
npx wrangler d1 create orivex-db
```

In the runtime `vars` of `wrangler.jsonc`, set `AUTH_ORIGIN` to the site's HTTPS origin and `AUTH_GITHUB_CLIENT_ID` to your production OAuth App's Client ID, and update the GitHub callback URL. Apply production migrations, rebuild, and deploy the generated Worker configuration:

```sh
npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc
npm run build
npx wrangler deploy --config dist/server/wrangler.json
npx wrangler secret put AUTH_GITHUB_CLIENT_SECRET --config wrangler.jsonc
```

Enter `AUTH_GITHUB_CLIENT_SECRET` interactively with the final command; never put it in version control or browser code. The migration command applies every pending migration, including `0002`. Local `.dev.vars` values do not automatically become production secrets. See Cloudflare's [environment variable](https://developers.cloudflare.com/workers/configuration/environment-variables/) and [secret](https://developers.cloudflare.com/workers/configuration/secrets/) documentation.

After building, `npm run verify:api` tests the compiled Worker with an isolated temporary Miniflare database and test data. It verifies access controls, input validation, persistence, image-upload rejection, metadata-only publishing, self-review rejection, review uniqueness, revision history, responses, and localized API errors. Normal development and production use GitHub OAuth. Tests never connect to or change production data.

## Dependencies and models

- [Transformers.js 3.8.1](https://github.com/huggingface/transformers.js), loaded from a fixed jsDelivr ESM version.
- [CLIP ViT-B32 ONNX](https://huggingface.co/Xenova/clip-vit-base-patch32).
- [Multilingual MiniLM-L12](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2).

Model weights use their respective licenses. Icons are from Lucide. GitHub is used for sign-in; source is distributed as a downloadable ZIP. Optional WebMCP tools are registered only when the browser exposes that capability.
