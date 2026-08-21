# Open Decisions

## Status: open | researching | blocked | deferred | closed

## MVP Blockers

| ID | Decision | Blocks | Status | Outcome Needed |
|---|---|---|---|---|
| OD-001 | DB choice: Supabase Postgres vs SQLite dev fallback config | 01 | open | Decide .env & docker-compose |
| OD-002 | LLM provider: OpenAI vs Gemini vs both; key management | 05,06 | open | Env & cost cap ADR |
| OD-003 | Resend domain & sender address | 06 | open | Verify DNS |
| OD-004 | Glints/Jobstreet parser selector stability | 03 | researching | Confirm cheerio selectors, fallback |
| OD-005 | NextAuth providers: credentials vs Google only | 01 | closed | Resolved: email+password Credentials provider, JWT sessions, no PrismaAdapter (simpler, "nothing fancy"). Google/Email magic-link deferred to later feature when OAuth/Resend creds exist. |

## Before Feature

| ID | Decision | Before | Status |
|---|---|---|---|
| OD-006 | PDF storage: Supabase Storage vs local /tmp | 02 | open |
| OD-007 | Cover letter tone template (formal vs casual ID) | 06 | open |
| OD-008 | Kanban lib: dnd-kit vs pragmatic-drag | 04 | open |
| OD-009 | Rate limit thresholds for AI scoring | 05 | open |
| OD-010 | Cron schedule & keyword strategy for Fase 3 | 08 | deferred |

## Deferred Beyond MVP

| ID | Decision | Status | Roadmap |
|---|---|---|---|
| OD-011 | LinkedIn source | deferred | post-MVP |
| OD-012 | PWA offline | deferred | Fase 3 |
| OD-013 | OCR for scanned PDF | deferred | post-MVP |

## Closed

| ID | Resolution |
|---|---|
| CD-001 | Stack Next.js+Prisma decided |
| CD-002 | Paste-URL first, no brutal polling |
