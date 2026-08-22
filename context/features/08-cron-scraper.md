# Feature 08: Cron Scraper & Recommendations (Fase 3)

Status: in progress (implemented, pending deploy verification)

## Goal
Auto-cari lowongan per 6 jam berdasar skill Profile.

## User Outcome
Tab "Rekomendasi Untukmu" terisi otomatis di `/jobs`.

## In Scope
- Docker cron (Node scheduler, bukan Vercel Cron): `scripts/cron-runner.ts` jalan tiap 6 jam di service `cron` (compose).
- Keyword = top 5 `Profile.skills`; search Glints (`/id/opportunities/jobs/explore?keyword=`) + Jobstreet (`/en/job-search?key=`).
- Parse search-result links → fetch detail (reuse `parseGlints`/`parseJobstreet`) → upsert `Job` (by sourceUrl) + buat `Recommendation` per user.
- Batch 20 per user per run; 429 exponential backoff (base 5s, max 3 retry).
- Manual trigger `POST /api/cron/scrape` (user saat ini) / `?all=1` (semua user).
- UI tab "Rekomendasi Untukmu" via `GET /api/jobs/recommended`.
- Docker: `Dockerfile` + `docker-compose.yml` (`app` + `cron`), tanpa container Postgres (DB eksternal via `DATABASE_URL`). Chromium di-install di image untuk fallback render search page (Playwright).

## Out Of Scope
- Auto-apply bot; MVP blocking lainnya.

## Acceptance Criteria
- [x] Cron batch 20, handle 429 backoff
- [x] Manual trigger works
- [x] Tab Rekomendasi Untukmu tampil

## Dependencies
- 01, 02, 03

## Decisions
- Lihat OD-010 (cron schedule & keyword strategy) — closed.

