# Build Plan

## Delivery Rule

Build one feature at a time. Feature complete only when code, tests, docs, and acceptance criteria pass. Frontend-only without backend hollow must still be testable via mock/seeding.

## Phase 0: Context & Skeleton

1. Context docs & feature specs done (this plan).
2. Init Next.js 16 + TS strict + Tailwind + shadcn + ESLint + Prettier.
3. Setup Prisma + external PostgreSQL + `.env.example`

## Phase 1: Foundation

### Feature 01: Foundation, Auth & DB
- Next.js scaffold, layout, theming tokens
- Prisma schema (User, Profile, Job, Application, EmailLog), migrations
- NextAuth (email+password Credentials), middleware protected routes
- Seed & basic CRUD health check

## Phase 2: Core Data Ingestion

### Feature 02: CV Upload & Parse (PDF)
- Upload endpoint, pdf-parse, Profile save & display
- Validation: PDF only, 5MB, text extraction fallback message

### Feature 03: Job Fetch via Paste URL (Glints & Jobstreet)
- Allowlisted fetch + cheerio parsers modular (glints.ts, jobstreet.ts)
- Job detail page, deduplication by sourceUrl
- Manual fallback form if parse fails

## Phase 3: Tracking & Intelligence

### Feature 04: Application Tracker (Kanban)
- CRUD Application, status enum, drag-drop (dnd-kit), notes, follow-up date
- Dashboard Kanban + list view, filter by status/company

### Feature 05: AI Matching Score
- Scoring prompt, cache, UI badge (0-100), matched/missing display
- Rate limit & error handling

## Phase 4: Engagement

### Feature 06: Email & Cover Letter
- Delivered scope: AI/heuristic cover-letter generator, editable and persisted
- Deferred scope: Resend send endpoint and EmailLog writes (OD-003)

### Feature 07: Dashboard & Analytics
- Stats: total applications, sent, interview rate, offers, status distribution
- Reminder: user-owned follow-up dates due within H+7

## Phase 5: On-Demand Discovery

### Feature 08: On-demand Job Search & Recommendations
- Search Glints/Jobstreet only when triggered from `/jobs`
- Generate role searches from the full CV and stream AI-only scored previews over SSE
- Inspect at most 30 balanced details; show only scores >=70, highest first
- User explicitly selects results to save as Recommendation
- No scheduler or cron service

## Promoted Extension

### Feature 12: Extension-Native Job Capture
- Manifest V3 popup parses and previews the active Glints/Jobstreet detail DOM
- PKCE connection plus per-installation scoped direct-save token
- Multi-browser server connections and current-browser installation handshake
- Authenticated ZIP download remains permanently available

## Current Delivery

- Features 01-07 and 12 are implemented and pass repository release gates.
- Feature 08 implementation and automated tests pass; status remains in progress
  pending live Glints/Jobstreet and deployed-environment verification.
- The remediation tranche covering authorization, storage, SSRF, validation,
  rate limiting, accessibility, CI, migrations, and container runtime is done.
- Email remains deferred under OD-003.

## Global Release Gates

- No hardcoded colors/tailwind palette in components (token only)
- `yarn lint` + `yarn typecheck` + `yarn test` + `yarn build` pass
- Secrets not logged, env validated
- All fetch handle timeout & HTML change gracefully
- CI executes every release-gate command, including `yarn test`

## Post-MVP

Tracked in `roadmap.md`. Create a feature spec only when a candidate is promoted
through an explicit decision.
