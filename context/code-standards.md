# Code Standards

## General

- Build only active feature in `progress-tracker.md`.
- Smallest correct change, no hidden scope creep.
- Every feature has acceptance criteria & verification.
- No TODO in completed feature code.
- Secrets never in logs/UI/errors/repo.

## TypeScript / Next.js

- TypeScript strict, no `any` (use `unknown` + narrow).
- Named exports for components/utils.
- Server Components where possible; Client Components only when need interactivity (`"use client"`).
- Validate all inputs with Zod at API boundary.
- No direct Prisma import in `components/` — via `lib/` or server actions.
- Handle loading/error/empty states for every async UI.
- Do not mirror DB state in client; derive from server fetch + revalidate.

## Prisma / DB

- All schema changes via `prisma migrate`.
- Foreign keys on, timestamps UTC.
- Repository pattern: keep queries in `lib/db/*` if complex.
- Never expose raw DB errors to UI — map to user message.

## API Routes

- Typed request/response (Zod).
- Auth check first (`getServerSession`), then ownership check.
- Timeout & try/catch for external calls (scraper, LLM, email).
- Return correct HTTP codes (400 validation, 401 unauth, 403 forbidden, 429 rate-limit).

## Scraper

- Parser pure: `string (HTML) -> Job` . Fetch separately.
- Allowlist domains; reject others.
- Timeout 10s, UA valid, handle 404/403/429 gracefully.
- If HTML structure changed, return `parseError` not crash.

## Security

- Env validated at startup (Zod).
- CSRF & rate-limit where needed.
- Sanitize HTML before render (job description).
- Email templates plain, no user HTML injection.

## Tests

- Pure logic: unit table-driven.
- DB: integration with test DB / mock.
- Parser: fixture HTML snapshot tests.
- API: auth & validation tests.
- UI: critical interaction (kanban drag, upload).

## Docs

- Update feature spec if decision changes.
- Update `progress-tracker.md` on status change.
- Update `ui-registry.md` after reusable UI via `/imprint`.
- Update `library-docs.md` before new deps.

## Commits

- Follow `versioning.md` — Conventional Commits, one logical change.
