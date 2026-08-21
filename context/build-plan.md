# Build Plan

## Delivery Rule

Build one feature at a time. Feature complete only when code, tests, docs, and acceptance criteria pass. Frontend-only without backend hollow must still be testable via mock/seeding.

## Phase 0: Context & Skeleton

1. Context docs & feature specs done (this plan).
2. Init Next.js 16 + TS strict + Tailwind + shadcn + ESLint + Prettier.
3. Setup Prisma + Supabase/Docker + .env.example

## Phase 1: Foundation

### Feature 01: Foundation, Auth & DB
- Next.js scaffold, layout, theming tokens
- Prisma schema (User, Profile, Job, Application, EmailLog), migrations
- NextAuth (email + Google), middleware protected routes
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
- Resend integration, send email from application, EmailLog
- AI cover-letter generator (CV + JD → draft), editable before send

### Feature 07: Dashboard & Analytics
- Stats: total applied, interview rate, response rate
- Reminder: follow-up H+7, interview tomorrow

## Phase 5: Automation (Post-MVP but planned)

### Feature 08: Cron Scraper & Recommendations
- Playwright cron every 6h, keyword dari Profile.skills
- "Rekomendasi Untukmu" tab, save to Wishlist

## Global Release Gates

- No hardcoded colors/tailwind palette in components (token only)
- `yarn lint` + `yarn typecheck` + `yarn test` + `yarn build` pass
- Secrets not logged, env validated
- All fetch handle timeout & HTML change gracefully

## Post-MVP

Tracked in `roadmap.md` and `features/post-mvp/`. Promote only via explicit decision.
