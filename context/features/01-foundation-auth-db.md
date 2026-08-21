# Feature 01: Foundation, Auth & DB

## Goal
Setup Next.js 15 + Prisma + Auth agar semua fitur punya fondasi aman multi-user.

## User Outcome
User bisa register/login (email + Google), akses halaman protected, data terisolasi per user.

## In Scope
- Next.js scaffold, Tailwind v4, shadcn init, tokens, layout
- Prisma schema: User, Profile, Job, Application, EmailLog + migration
- NextAuth v5 + PrismaAdapter, middleware, env validation (Zod)
- Seed script, health check /api/health

## Out Of Scope
- CV, scraper, tracker, AI (fitur 02+)

## Behavior & Safety
- Setiap query filter by `session.user.id`
- Never log secrets, validate env at startup
- DB: Postgres Supabase prod, SQLite dev fallback via `DATABASE_URL`

## Acceptance Criteria
- [ ] `yarn build` pass
- [ ] Login email & Google works, protected routes redirect jika belum login
- [ ] Prisma migrate ok, seed creates demo user
- [ ] Tokens dipakai, no hardcoded colors

## Dependencies
- None
