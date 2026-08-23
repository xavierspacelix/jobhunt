# Open Decisions

## Status: open | researching | blocked | deferred | superseded | closed

## MVP Blockers

| ID | Decision | Blocks | Status | Outcome Needed |
|---|---|---|---|---|
| OD-001 | DB choice: Supabase Postgres vs SQLite dev fallback config | 01 | closed | External PostgreSQL via `DATABASE_URL`; no SQLite fallback |
| OD-002 | LLM provider: OpenAI vs Gemini vs both; key management | 02,05,06,08 | closed | Provider-agnostic OpenAI-compatible endpoint via `LLM_*`; heuristic fallback |
| OD-003 | Resend domain & sender address | future email feature | open | Verify DNS |
| OD-004 | Glints/Jobstreet parser selector stability | 03 | closed | JSON-LD JobPosting + baseSalary/page-text scan; paragraph-preserving description; Playwright fallback for failed/blocked native fetch |
| OD-005 | NextAuth providers: credentials vs Google only | 01 | closed | Resolved: email+password Credentials provider, JWT sessions, no PrismaAdapter (simpler, "nothing fancy"). Google/Email magic-link deferred to later feature when OAuth/Resend creds exist. |

## Before Feature

| ID | Decision | Before | Status | Outcome |
|---|---|---|---|---|
| OD-006 | PDF storage: Supabase Storage vs local /tmp | 02 | closed | MinIO S3-compatible; UUID-versioned local fallback persisted by Compose volume |
| OD-007 | Cover letter tone template (formal vs casual ID) | 06 | closed | Formal Bahasa Indonesia, editable before save |
| OD-008 | Kanban lib: dnd-kit vs pragmatic-drag | 04 | closed | `@dnd-kit/core` + utilities |
| OD-009 | Rate limit thresholds for AI scoring | 05 | closed | Resolved: 10 req/min per user (fixed window, in-memory) |
| OD-010 | Cron schedule & keyword strategy for Fase 3 | 08 | superseded | **Superseded (2026-08-22; refined 2026-08-24):** cron dibatalkan. Job search sekarang **on-demand** via SSE. Manual input menerima top 10; one-click recommendation memakai LLM untuk membuat maksimal 5 role queries dari seluruh CV. Search membaca maksimal 2 pages/query/source, detail cap 30 dengan target 15/source, dan mempertahankan 429 backoff 5/10/20s. Hanya AI score >=70 ditampilkan; tidak ada heuristic fallback untuk recommendation flow. |
| OD-014 | Extension credential/write model | 12 | closed | Extension-native DOM preview and explicit direct-save via allowlisted public-client PKCE; hashed 90-day scoped token per browser installation; no web session/password or auto-apply |
| OD-015 | Shared vs user-owned Job persistence | 03,08 | closed | Signed server previews refresh SHARED canonical; unsigned/edited data is PRIVATE; SavedJob controls visibility/provenance |
| OD-016 | Production migrations and local CV durability | 01,02 | closed | Container auto-runs migrate deploy; Compose persists `/app/uploads`; MinIO optional/preferred |

## Deferred Beyond MVP

| ID | Decision | Status | Roadmap |
|---|---|---|---|
| OD-011 | LinkedIn source | deferred | post-MVP |
| OD-012 | PWA offline | deferred | post-MVP candidate |
| OD-013 | OCR for scanned PDF | deferred | post-MVP |

## Closed

| ID | Resolution |
|---|---|
| CD-001 | Stack Next.js+Prisma decided |
| CD-002 | Paste-URL first, no brutal polling |

## Remaining Blocker

- OD-003 is the only external-provider blocker: email sending stays out of the
  active feature scope until sender domain and credentials are approved.
