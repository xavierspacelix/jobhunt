# Progress Tracker

Update whenever feature status changes. Only one feature `in progress` unless explicitly split.

## Current Status

- Phase: Phase 1 - Foundation
- In progress: 08 - Cron Scraper & Recommendations
- Last completed: 06 - Email & Cover Letter (cover-letter generation)
- Next: 07 - Dashboard & Analytics

## Features

| ID | Feature | Specification | Status |
|---|---|---|---|
| 01 | Foundation, Auth & DB | `features/01-foundation-auth-db.md` | complete |
| 02 | CV Upload & Parse (PDF) | `features/02-cv-upload-parse.md` | complete |
| 03 | Job Fetch Paste URL (Glints & Jobstreet) | `features/03-job-fetch.md` | complete |
| 04 | Application Tracker (Kanban) | `features/04-tracker-kanban.md` | complete |
| 05 | AI Matching Score | `features/05-ai-matching.md` | complete |
| 06 | Email & Cover Letter | `features/06-email-coverletter.md` | complete |
| 07 | Dashboard & Analytics | `features/07-dashboard-analytics.md` | planned |
| 08 | Cron Scraper & Recommendations | `features/08-cron-scraper.md` | in progress |

Allowed status: `planned`, `in progress`, `blocked`, `complete`.

## Decisions

- Web only, PWA later.
- Auth: NextAuth multi-user.
- CV PDF only, no OCR MVP.
- Paste-URL fetch first, cron later.
- Semi-auto via Resend, no auto-login bot.
- AI scoring cache per profile+job.
- CV storage: user-run MinIO (S3-compatible); local-disk fallback when `MINIO_*` unset.
- CV extraction: provider-agnostic OpenAI-compatible LLM (`LLM_BASE_URL`); NOT OpenAI/Gemini; heuristic fallback when key absent.
- CV extraction field set = Glints-style profile (fullName, headline, location, email, phone, skills, summary, experience, education, certifications, links); hasil bisa diedit via PUT /api/profile (inline edit di /profile).
- Feature 03 (Job Fetch): render via native fetch dulu, fallback local headless browser (Playwright + Chromium lokal) bila 403/Cloudflare; parser cheerio JSON-LD + meta. Browserbase dibatalkan (tidak tersedia di Indonesia).
- AI-scrape (LLM parse) ditunda setelah Kanban: rencana hybrid cheerio dulu, fallback LLM bila hasil sparse. Butuh LLM key (OD-002).
- Deploy: Docker (bukan Vercel). Compose = `app` + `cron`, tanpa container Postgres (DB eksternal via `DATABASE_URL`). Cron jalan sebagai proses Node scheduler (`scripts/cron-runner.ts`, `setInterval` 6 jam) di service `cron`, bukan OS cron (hindari masalah env injection). Laravel/Playwright Chromium di-install di image untuk fallback render search page.

## Blockers

- Need Supabase/DB creds for Feature 01 (see open-decisions.md OD-001)
- Need OpenAI/Gemini key for Feature 05 (OD-002)
- Need Resend domain verification for Feature 06 email-send (OD-003) — cover-letter generation already done

## Post-MVP Roadmap

See `roadmap.md`. Not active until promoted.

## Notes
- Feature 06 split by user request: **cover-letter generation** implemented (formal Bahasa Indonesia; AI via LLM with heuristic fallback; editable + saved to `Application.coverLetter`). **Email send via Resend deferred** pending OD-003 (domain/key).

- Feature 08 implemented (Docker cron): keyword = top 5 `Profile.skills`, search Glints + Jobstreet, batch 20 per user per run, 429 exponential backoff (base 5s). Save `Job` (upsert by sourceUrl) + `Recommendation` per user. Manual trigger `POST /api/cron/scrape` (current user) / `?all=1`. UI tab "Rekomendasi Untukmu" di `/jobs` via `GET /api/jobs/recommended`. Docker: `Dockerfile` + `docker-compose.yml` (`app` + `cron`, no pgsql). See OD-010.

- Feature-level decisions belong in its spec file.
- `features/README.md` defines spec maintenance.
