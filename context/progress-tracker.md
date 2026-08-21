# Progress Tracker

Update whenever feature status changes. Only one feature `in progress` unless explicitly split.

## Current Status

- Phase: Phase 1 - Foundation
- In progress: 02 - CV Upload & Parse (PDF)
- Last completed: 01 - Foundation, Auth & DB
- Next: Feature 02 - CV Upload & Parse (PDF)

## Features

| ID | Feature | Specification | Status |
|---|---|---|---|
| 01 | Foundation, Auth & DB | `features/01-foundation-auth-db.md` | complete |
| 02 | CV Upload & Parse (PDF) | `features/02-cv-upload-parse.md` | in progress |
| 03 | Job Fetch Paste URL (Glints & Jobstreet) | `features/03-job-fetch.md` | planned |
| 04 | Application Tracker (Kanban) | `features/04-tracker-kanban.md` | planned |
| 05 | AI Matching Score | `features/05-ai-matching.md` | planned |
| 06 | Email & Cover Letter | `features/06-email-coverletter.md` | planned |
| 07 | Dashboard & Analytics | `features/07-dashboard-analytics.md` | planned |
| 08 | Cron Scraper & Recommendations | `features/08-cron-scraper.md` | planned |

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

## Blockers

- Need Supabase/DB creds for Feature 01 (see open-decisions.md OD-001)
- Need OpenAI/Gemini key for Feature 05 (OD-002)
- Need Resend domain verification for Feature 06 (OD-003)

## Post-MVP Roadmap

See `roadmap.md`. Not active until promoted.

## Notes

- Feature-level decisions belong in its spec file.
- `features/README.md` defines spec maintenance.
