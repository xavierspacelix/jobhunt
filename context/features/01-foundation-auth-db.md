# Feature 01: Foundation, Auth & DB

## Goal
Setup Next.js 16 + Prisma + Auth agar semua fitur punya fondasi aman multi-user.

## User Outcome
User bisa register/login (email + password), akses halaman protected, data terisolasi per user.

## In Scope
- Next.js scaffold, Tailwind v4, shadcn init, tokens, layout
- Prisma schema: User, Profile, Job, Application, EmailLog + migration
- NextAuth v5 Credentials (email+password) + JWT, middleware, env validation (Zod)
- Seed script, health check /api/health

## Out Of Scope
- CV, scraper, tracker, AI (fitur 02+)

## Behavior & Safety
- User-owned query harus derive identity dari authenticated session.
- Never log secrets. Zod env validation runs through Node instrumentation;
  production requires `AUTH_URL` and `AUTH_SECRET` >=32 characters.
- DB: PostgreSQL only via `DATABASE_URL` and Prisma driver adapter.
- Credentials login/registration are process-locally limited per IP and email.

## Acceptance Criteria
- [x] `yarn build` pass
- [x] Credentials login works dan semua protected pages redirect jika belum login
- [x] Prisma migrations tersedia dan seed creates demo user
- [x] Tokens dipakai; authenticated pages share `AuthenticatedShell` plus root
  loading/error states

## Dependencies
- None

## Deferred / Known Gaps

- Google OAuth dan email magic link deferred by OD-005.
- 11 migrations validate/status clean; CI applies them to PostgreSQL. Docker
  startup migration is implemented but no local image smoke was possible.
