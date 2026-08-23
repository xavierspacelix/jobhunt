# Implementation Audit - Current Status (2026-08-24)

## Outcome

The remediation tranche is implemented. The earlier snapshot findings are not
current behavior. Product scope remains defined by the feature specs and design
intent remains defined by the UI docs and MASTER.

## Resolved Controls

- All authenticated pages use `AuthenticatedShell`; `/dashboard`, `/profile`,
  `/jobs`, and `/tracker` are proxy-protected. Root loading and recoverable error
  states are present.
- CV upload checks size, MIME, PDF magic, encryption/text extraction, and a
  process-local rate limit. Retrieval uses the authenticated Profile key only,
  with normalized/real-path containment. UUID object keys provide atomic active
  version replacement and cleanup after DB success/failure.
- `Job.scope`, `ownerId`, `dedupeKey`, and `SavedJob` separate shared canonical
  data from user-private manual/edited data. User lists are relation-scoped;
  unsave does not delete another user's state or a shared canonical.
- Shared Job creation/refresh requires a valid user-bound HMAC preview token with
  a 15-minute lifetime. Invalid/expired tokens are rejected. Unsigned manual or
  edited submissions are PRIVATE and deduplicated per user.
- Search saves record provenance through `SavedJob.origin` and Recommendation;
  UI origin resolves to manual, search, or both.
- CV recommendation search generates role queries from the full Profile, scans a
  balanced bounded batch, and shows only AI scores of at least 70. Signed previews
  bind bounded AI output and Profile revision to the job; per-candidate AI
  failures are omitted rather than replaced with heuristic scores. Save rejects
  stale profiles and persists all recommendation relations atomically.
- Scraper URLs are HTTPS-only and source-allowlisted. Native transport pins DNS
  on every redirect hop, blocks special/private addresses and cross-source
  redirects, caps redirects/body/time. Browser fallback pins the exact initial
  host and allows same-origin resources/navigation only.
- Environment validation runs from Next instrumentation; production requires
  `AUTH_URL` and an `AUTH_SECRET` of at least 32 characters. LLM/MinIO settings
  must be complete pairs/groups.
- Credentials login and registration are limited by both client IP and normalized
  email; expensive CV, fetch, search, recommendation, keyword, match, and cover
  letter paths are also limited.
- LLM calls have a timeout and strict output parsers. Match cache keys include
  relevant Job content. Heuristic fallback remains available.
- PostgreSQL health is checked by `/api/health`. CI validates schema, applies
  migrations, and runs lint/typecheck/tests/build against PostgreSQL.
- The production image installs Chromium, runs non-root, has a health check, and
  includes the Prisma CLI config, and applies migrations before startup. Compose
  persists local uploads and enforces a 6 MiB Traefik request-body ceiling.
- Feature 12 provides Manifest V3 DOM capture, complete local preview, explicit
  direct-save, allowlisted PKCE connection, per-installation expiring tokens, and
  current-browser install detection without exposing web session credentials.

## Data and Artifacts

- Prisma has 14 migrations, including extension download tracking, SavedJob/job
  ownership, extension-native auth/capture, and multi-installation credentials.
- Legacy Jobs are retained as ownerless SHARED rows. Ownership is never guessed;
  rows without a current user's SavedJob/Application/Recommendation/Match
  relation are invisible to that user.
- Active scoring is stored in `Match`; legacy Application match columns remain.
- EmailLog remains schema-only. There is no email provider or send endpoint.
- Extension source is under `browser-extension/`; the downloadable artifact is
  `public/jobhunter-chrome-extension.zip`.

## Verified Gates

| Gate | Current result |
|---|---|
| `yarn lint` | pass |
| `yarn typecheck` | pass |
| `RUN_DB_TESTS=1 yarn test` | pass, 103/103 across 16 files |
| `yarn build` | pass |
| `yarn prisma validate` | pass |
| `yarn prisma migrate status` | pass |
| `unzip -t public/jobhunter-chrome-extension.zip` | pass |
| Docker image smoke | not run: Docker command unavailable locally |

There is no format-check gate and no browser E2E suite.

## Residual and External Gaps

- Rate limits are fixed-window, process-local maps. They reset on restart and do
  not coordinate across replicas; a shared limiter is required for scale-out.
- Live Glints/Jobstreet behavior, anti-bot changes, browser fallback, and the full
  deployed Feature 08 flow still require external-environment validation.
- Docker image startup, automatic migration, health, volume behavior, and MinIO
  integration have not been smoke-tested in this local environment.
- Strict output schemas reduce malformed LLM output, but CV/JD text remains
  untrusted prompt content. Prompt injection cannot be fully eliminated; all AI
  scores, extraction, keywords, and cover letters remain user-reviewable advice.
- Ownerless legacy SHARED jobs without user relations are intentionally hidden
  rather than assigned speculative ownership; administrative cleanup is future
  operational work.
- Google OAuth, magic links, Resend/Nodemailer, email delivery, and EmailLog writes
  are not implemented. OD-003 remains open.
- Tests cover pure logic, security helpers, proxy behavior, extension UI contracts,
  and PostgreSQL ownership/PKCE/multi-installation/direct-save paths, but not full browser UI, live
  sources, deployed Docker, MinIO, or email E2E.
