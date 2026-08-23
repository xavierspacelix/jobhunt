# Progress Tracker

Update whenever feature status changes. Only one feature `in progress` unless
explicitly split. Detailed implementation facts belong in feature specs,
architecture, library docs, UI registry, or `implementation-audit.md`.

## Current Status

- Phase: Phase 5 - On-Demand Discovery
- In progress: 08 - On-demand Job Search & Recommendations
- Last delivered: 12 - Extension-Native Job Capture
- Next: Feature 08 live external/deployed-environment verification

## Features

| ID | Feature | Specification | Status |
|---|---|---|---|
| 01 | Foundation, Auth & DB | `features/01-foundation-auth-db.md` | complete |
| 02 | CV Upload & Parse (PDF) | `features/02-cv-upload-parse.md` | complete |
| 03 | Job Fetch Paste URL | `features/03-job-fetch.md` | complete |
| 04 | Application Tracker | `features/04-tracker-kanban.md` | complete |
| 05 | AI Matching Score | `features/05-ai-matching.md` | complete |
| 06 | Cover Letter Generation | `features/06-email-coverletter.md` | complete |
| 07 | Dashboard & Analytics | `features/07-dashboard-analytics.md` | complete |
| 08 | On-demand Job Search & Recommendations | `features/08-job-search.md` | in progress |
| 12 | Extension-Native Job Capture | `features/12-chrome-extension.md` | complete |

Allowed status: `planned`, `in progress`, `blocked`, `needs remediation`,
`complete`.

Feature 06 completion refers only to cover-letter generation. Email sending is
deferred under OD-003 and is not represented as delivered.

## Current Decisions

- Credentials auth with JWT; Google/email magic link deferred.
- PostgreSQL only, supplied externally by `DATABASE_URL`.
- MinIO stores CV blobs; UUID local fallback is persisted by the Compose volume.
- AI uses a provider-agnostic OpenAI-compatible endpoint and heuristic fallback.
- Paste-URL and on-demand search use native fetch with local Playwright fallback.
- Feature 08 has no cron: search streams previews, then user explicitly saves a
  selected result as a Recommendation.
- CV recommendations generate up to five role queries with AI, inspect at most
  30 balanced Glints/Jobstreet details, and show only AI scores >=70 descending;
  per-candidate AI failures are omitted without heuristic substitution.
- Signed previews control SHARED Job refresh; unsigned/edited manual data is
  PRIVATE and SavedJob controls user visibility/provenance.
- Extension capture uses allowlisted-ID PKCE, independent per-browser tokens,
  local DOM preview, and explicit PRIVATE direct-save with separate provenance.
- Production is Docker/Traefik with automatic migrations, non-root runtime,
  persistent uploads, and external DB.

Full outcomes: `open-decisions.md`. Current implementation: `architecture.md`.

## Blockers and Gates

- OD-003: sender domain/key required before email sending can be promoted.
- Feature 08 live end-to-end needs deployed Docker + reachable PostgreSQL +
  external network access to Glints/Jobstreet.
- Verified: lint, typecheck, and build pass; 102/102 tests in 16 files pass with
  `RUN_DB_TESTS=1`; Prisma validate/status and extension ZIP integrity pass.
- Docker command is unavailable locally, so no image smoke is claimed. There is
  no format gate or browser E2E suite.

## Audit

`implementation-audit.md` records current remediation status, verified gates,
and honest residual/external gaps.
