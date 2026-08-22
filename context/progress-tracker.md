# Progress Tracker

Update whenever feature status changes. Only one feature `in progress` unless explicitly split.

## Current Status

- Phase: Phase 1 - Foundation
- In progress: 08 - Cron Scraper & Recommendations
- Last completed: 07 - Dashboard & Analytics
- Next: —

## Features

| ID | Feature | Specification | Status |
|---|---|---|---|
| 01 | Foundation, Auth & DB | `features/01-foundation-auth-db.md` | complete |
| 02 | CV Upload & Parse (PDF) | `features/02-cv-upload-parse.md` | complete |
| 03 | Job Fetch Paste URL (Glints & Jobstreet) | `features/03-job-fetch.md` | complete |
| 04 | Application Tracker (Kanban) | `features/04-tracker-kanban.md` | complete |
| 05 | AI Matching Score | `features/05-ai-matching.md` | complete |
| 06 | Email & Cover Letter | `features/06-email-coverletter.md` | complete |
| 07 | Dashboard & Analytics | `features/07-dashboard-analytics.md` | complete |
| 08 | On-demand Job Search & Recommendations | `features/08-job-search.md` | in progress |

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
- Deploy: Docker (bukan Vercel). Compose = `web` (Traefik) + `dev` (hot reload), tanpa container Postgres (DB eksternal via `DATABASE_URL`). Tidak ada service cron — job search on-demand dari UI (`/jobs` → "Cari Lowongan"). Playwright/Chromium di-install di image untuk fallback render search page (403/Cloudflare).

## Blockers

- Need Supabase/DB creds for Feature 01 (see open-decisions.md OD-001)
- Need OpenAI/Gemini key for Feature 05 (OD-002)
- Need Resend domain verification for Feature 06 email-send (OD-003) — cover-letter generation already done

## Post-MVP Roadmap

See `roadmap.md`. Not active until promoted.

## Notes
- Feature 06 split by user request: **cover-letter generation** implemented (formal Bahasa Indonesia; AI via LLM with heuristic fallback; editable + saved to `Application.coverLetter`). **Email send via Resend deferred** pending OD-003 (domain/key).

- Feature 08 **dibuat ulang tanpa cron** (per keputusan user): sekarang **On-demand Job Search**. Section "Cari Lowongan" di `/jobs` dengan input kata kunci (bisa > skill profil), panel progres live (SSE), hasil masuk ke tab "Rekomendasi Untukmu" (`GET /api/jobs/recommended`). Pipeline `lib/job-search.ts`: keyword user (top 10) → search Glints + Jobstreet → batch 20 → 429 backoff (base 5s) → upsert `Job` + `Recommendation`. API `POST /api/jobs/search` (SSE). Cron dihapus: `lib/cron/`, `app/api/cron/`, `scripts/cron-runner.ts`, `scripts/cron-scrape.ts` dihapus. Compose sekarang `web`+`dev` (Traefik), tanpa service cron. OD-010 superseded.
- Verifikasi 08 (2026-08-22, r2): semua path kode lengkap & `lint/typecheck/build/test` lulus (34/34). `tests/job-search.test.ts` (parseKeywords + toJobData + BATCH_LIMIT). **Live end-to-end belum bisa di sandbox**: `DATABASE_URL` host unreachable (ECONNREFUSED) & Glints 403 — butuh env deploy (Docker + Postgres eksternal + network) untuk bukti nyata (jalankan search dari UI).

- Feature 07 implemented: Dashboard **bento layout** (Soft Warm Minimal): hero greeting + kelengkapan profil, KPI row (Total Lamaran, Terkirim, Wawancara + tingkat wawancara %, Penawaran), bento `lg:grid-cols-3` (Tindak Lanjut 7 Hari + kartu Profil & CV), lalu detail Keahlian/Pengalaman. Tindak Lanjut = aplikasi `nextFollowUpAt` ≤ H+7, exclude WISHLIST/REJECTED, sorted by date, label relatif, highlight interview. Semua query di-scope `user.email` (per-user). Komponen: `components/stat-card.tsx`, `components/reminder-list.tsx`, `components/status-badge.tsx` (reusable, dipakai juga di kanban).

- Feature-level decisions belong in its spec file.
- `features/README.md` defines spec maintenance.
