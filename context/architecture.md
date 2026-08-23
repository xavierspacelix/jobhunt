# Architecture

Dokumen ini menjelaskan arsitektur yang saat ini diimplementasikan. Residual dan
external gaps dicatat di `implementation-audit.md`.

## Stack

| Layer | Implementasi | Responsibility |
|---|---|---|
| Web | Next.js 16.3 App Router, React 19.2, TypeScript strict | SSR, UI, route handlers |
| Styling | Tailwind CSS v4, shadcn `base-nova`, Base UI, next-themes | Token, primitives, light/dark theme |
| Auth | Auth.js v5 beta Credentials, bcrypt, JWT session | Email/password authentication |
| DB | Prisma 7.9 + `@prisma/adapter-pg` + PostgreSQL | Persistence and migrations |
| CV | pdf-parse 1.1.1 | Text extraction from PDF |
| Storage | MinIO 8 (S3-compatible), persistent local `uploads/cvs` fallback | Active CV PDF blob |
| AI | Direct OpenAI-compatible `/chat/completions` request | CV extraction, matching, keywords, cover letter |
| Scraper | Native fetch, Cheerio, Playwright Chromium fallback | Paste-URL and on-demand search |
| Validation | Zod 3 plus manual narrowing in some routes | Request/env validation |
| Deploy | Docker, Compose, external Traefik and PostgreSQL | Production runtime |

Exact approved package versions and constraints live in `library-docs.md`.
There is no SQLite, Vercel cron, Vercel AI SDK, OpenAI SDK, Gemini SDK, Resend,
or Nodemailer integration in the current codebase.

## Repository Shape

```text
/
├── app/
│   ├── api/                    # Auth, CV, profile, jobs, search, match, applications
│   ├── dashboard/              # Analytics and reminders
│   ├── jobs/                   # Saved jobs, paste URL, on-demand search
│   ├── tracker/                # Board, table, and list tracker
│   ├── profile/                # CV and editable profile
│   ├── login/                  # Credentials login
│   └── register/               # Credentials registration
├── components/                 # Feature/shared components
│   └── ui/                     # shadcn/Base UI primitives
├── lib/
│   ├── generated/prisma/       # Generated Prisma client (ignored)
│   └── scrapers/               # Render, search-link, and source parsers
├── prisma/                     # Schema, seed, migrations
├── browser-extension/          # Manifest V3 DOM capture source
├── tests/                      # node:test unit/integration tests
├── context/                    # Product and engineering documentation
├── design-system/jobhunter/    # UI master and page overrides
├── public/...extension.zip     # Downloadable extension artifact
├── Dockerfile
└── docker-compose.yml
```

Feature logic currently also lives in top-level modules such as `lib/match.ts`,
`lib/llm.ts`, `lib/cover-letter.ts`, `lib/job-search.ts`, and
`lib/cv-parse.ts`. UI components currently live directly in `components/`; do
not assume a `components/features/` directory exists.

## Data Model

- `User`: credentials identity, extension download telemetry, per-installation
  extension connections/auth codes, optional profile, and user-owned records.
- `Profile`: one row per User (`userId` unique), parsed CV fields, raw text,
  active CV storage key, parser source, and timestamps. Uploading atomically
  switches to a new UUID key and removes the prior blob; no history table exists.
- `Job`: `SHARED` canonical rows dedupe by source URL; `PRIVATE` rows belong to
  one user and dedupe by user+source URL. `dedupeKey` is globally unique.
- `SavedJob`: user visibility/bookmark relation with `MANUAL` or `SEARCH` origin.
- `Application`: one row per User+Job, six-state tracker, notes, dates, and
  cover-letter draft. Legacy match columns still exist but active scoring uses
  `Match`.
- `Match`: active score cache, one row per User+Job, including matched/missing
  skills, source, and cache key.
- `Recommendation`: marks a Job explicitly saved from on-demand search and may
  retain its score. Together with SavedJob it displays manual/search/both origin.
- `EmailLog`: schema exists but no email-send implementation currently writes
  it.

Shared Jobs are visible only through the current user's SavedJob, Application,
Recommendation, or Match relation. Private Jobs are visible only to their owner.
Unsave removes user relations without deleting a shared canonical or another
user's records; unreferenced owned PRIVATE rows may be cleaned up.

## Module Boundaries

- Route handlers authenticate, validate input, and call `lib/*` or Prisma.
- Components do not import Prisma directly.
- Source-specific HTML parsing is kept in `lib/scrapers/glints.ts` and
  `lib/scrapers/jobstreet.ts`; fetch/render lives in `render.ts`.
- AI helpers use typed objects, strict output parsers, request timeout, and
  heuristic fallbacks.
- `instrumentation.ts` invokes Zod environment validation for the Node runtime.

## Authentication

- Auth.js Credentials provider accepts email/password and verifies bcrypt hash.
- Sessions use JWT; no PrismaAdapter, Google provider, or email magic link.
- `/dashboard`, `/profile`, `/jobs`, and `/tracker` redirect through `proxy.ts`
  while preserving a safe callback path.
- All four pages compose `AuthenticatedShell`; root `loading.tsx` and `error.tsx`
  provide accessible asynchronous/failure states.
- Login and registration use per-IP and per-email process-local limits.

## CV Pipeline

1. `POST /api/cv/upload` accepts multipart field `file`, MIME
   `application/pdf`, maximum 5 MiB.
2. Reject a literal PDF encryption marker, then extract text with dynamic
   `pdf-parse` import; OCR is not supported.
3. Extract profile fields with the configured OpenAI-compatible LLM or
   heuristic fallback.
4. Store a new UUID-versioned key in MinIO or `uploads/cvs` locally.
5. Upsert the Profile; remove the new blob if DB persistence fails, then remove
   the old blob only after the active key changes successfully.
6. `GET /api/profile` returns profile data and a presigned/local CV URL;
   `PUT /api/profile` persists supported edits.

`GET /api/cv` ignores caller keys and reads only the authenticated Profile's key.
Local paths are syntactically constrained and checked by real-path containment.
Compose mounts `/app/uploads`; MinIO remains preferred for object storage.

## Job Fetch

1. `POST /api/jobs/fetch-url` accepts supported HTTPS URLs, applies a rate limit,
   checks DNS, fetches/parses a preview, and signs it for the current user with a
   15-minute HMAC token.
2. Native transport pins an approved public IP for every hop, revalidates HTTPS,
   source, host, and DNS on redirect, and caps redirects, time, and response size.
3. Failed/blocked native responses may use Playwright Chromium with exact-host
   DNS pinning, blocked service workers/websockets, and same-origin-only requests
   and navigation.
4. Cheerio parsers prefer JSON-LD `JobPosting`, then source-specific DOM/meta
   fallbacks. Description paragraphs and salary text are normalized.
5. A valid token can create/refresh a SHARED canonical. An invalid token rejects;
   an unsigned or edited manual payload is saved as a PRIVATE user-owned Job.
6. UI exposes an editable fallback/preview and requires explicit Save.

## On-Demand Search

1. `POST /api/jobs/search` accepts keywords/location and returns SSE events:
   `start`, `search`, `links`, `detail`, `result`, `done`, or `error`.
2. Empty keywords fall back to Profile skills/headline/experience roles.
3. Input accepts ten normalized keywords; search URLs currently use the first
   five for each source.
4. Glints and Jobstreet result pages are processed sequentially; detail links
   are deduplicated and capped at 20 per run.
5. Closed jobs, jobs older than 30 days, and location mismatches are filtered.
6. Candidate details are scored with concurrency four and streamed as previews.
7. Result events include user-bound signed preview tokens. Search writes no DB
   rows; explicit selection calls `/api/jobs/recommendations`.
8. Recommendation save accepts only a valid token and upserts SHARED Job,
   SavedJob, Recommendation, and optionally Match. `GET /api/jobs` returns only
   user-visible rows with manual/search/both provenance.

Network limits are batch 20, minimum interval 1.5 seconds, and 429 retry delays
of 5/10/20 seconds.

## Matching and Cover Letter

- `POST /api/match` scores the current Profile against a Job and stores a
  separate `Match` row.
- Cache key includes Profile revision, prompt version, and relevant Job content.
- Match and cover-letter endpoints each use a separate in-memory fixed-window
  limit of 10 requests per user email per minute. Limits are process-local.
- LLM requests use `LLM_BASE_URL`, `LLM_API_KEY`, optional `LLM_MODEL` and
  bounded `LLM_TIMEOUT_MS` (120-second default),
  temperature 0.2, and JSON mode. Heuristic fallback is available.
- `POST /api/ai/cover-letter` generates and stores a formal Indonesian draft in
  `Application.coverLetter`.
- Email sending and EmailLog creation are deferred and not implemented.

## Deployment

- `package.json` enforces Node `>=24 <25`; CI/image use Node 24 and Yarn 1.22.22.
- `docker-compose.yml` defines one production `web` service behind an external
  `traefik-public` network. It does not define dev, Postgres, MinIO, or cron
  services.
- PostgreSQL and optionally MinIO are external resources supplied through env.
- Container startup automatically runs `prisma migrate deploy`, then Next.js as
  UID/GID 1001. Chromium is installed for browser fallback.
- Docker HEALTHCHECK calls the DB-aware `/api/health` endpoint. Compose persists
  `/app/uploads` in a named volume and applies a 6 MiB Traefik body limit.

## Browser Extension

- `browser-extension/` contains a Chrome/Edge Manifest V3 popup that reads
  JSON-LD/DOM from an explicitly active Glints/Jobstreet detail tab, previews the
  bounded payload locally, and direct-saves only after explicit confirmation.
- The service worker owns `chrome.identity.launchWebAuthFlow`, PKCE S256,
  short-lived single-use auth codes, and hashed 90-day scoped bearer tokens bound
  to the allowlisted extension ID and a per-browser installation ID.
- Release host permissions are production-only; end users do not configure a
  backend URL or localhost detection in the popup.
- Multiple installations per user are independent. A restricted external-message
  handshake detects the bundled extension only in the current dashboard browser;
  server connection status cannot prove installation on another device.
- Extension captures use PRIVATE Job rows with isolated extension dedupe/provenance.
  `/jobs` requests `GET /api/jobs?origin=extension`; the default endpoint contract
  remains compatible with manual/search consumers.
- `GET /api/extension/download` requires a session, records
  `extensionDownloadedAt`, and serves the no-store ZIP artifact with attachment
  and `nosniff` headers.

## Verification

- Unit tests use Node's built-in test runner through `tsx`.
- Tests include security helpers, proxy behavior, extension UI contracts, and
  opt-in PostgreSQL ownership/PKCE/multi-installation/direct-save integration.
- CI runs Prisma validate/migrate, lint, typecheck, tests with `RUN_DB_TESTS=1`,
  and build. There is no format gate or browser E2E suite.
- See `implementation-audit.md` for exact verified commands and external gaps.
