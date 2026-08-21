# Architecture

## Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 16 App Router + React 19 + TypeScript strict | UI, routing, SSR/CSR |
| Styling | Tailwind CSS v4 + shadcn/ui | Design system, tokens |
| Auth | NextAuth.js v5 (Auth.js) | Email + Google OAuth, session |
| DB | Prisma 7 ORM + Postgres (Supabase) / SQLite dev | Persistence, migrations |
| CV Parse | pdf-parse / pdfjs | Ekstrak teks PDF |
| AI | Vercel AI SDK + OpenAI / Gemini | Scoring & cover letter |
| Scraper | fetch + cheerio (MVP), Playwright (Fase 3 cron) | Fetch JD via URL |
| Email | Resend (primary), Nodemailer fallback | Kirim lamaran & reminder |
| Deploy | Vercel + Cron | Hosting & scheduled jobs |
| Validation | Zod | Input & env validation |

Exact package versions must be approved in `library-docs.md` before use.

## Repository Shape

```text
/
├── app/                    # Next.js app router
│   ├── (auth)/             # login/register
│   ├── dashboard/          # kanban tracker
│   ├── jobs/               # list & detail
│   ├── profile/            # CV & skills
│   └── api/                # route handlers
├── components/
│   ├── ui/                 # shadcn primitives
│   └── features/           # domain components
├── lib/
│   ├── scrapers/           # glints.ts, jobstreet.ts
│   ├── ai/                 # scoring, cover-letter
│   ├── email/              # resend client
│   └── parsers/            # cv-parser.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── context/                # docs (this folder)
├── public/
└── tests/
```

Keep implementation modular inside these folders. New top-level folder only for real boundary.

## Data Model (Prisma)

```prisma
User { id, name, email, emailVerified, image }
Profile { id, userId FK, rawText, skills String[], summary, experience Json, createdAt }
Job { id, title, company, location, salary, source (GLINTS|JOBSTREET), sourceUrl unique, description, postedAt }
Application { id, userId FK, jobId FK, status enum, matchScore Int?, matchedSkills String[], missingSkills String[], coverLetter String?, notes String?, appliedAt, nextFollowUpAt }
EmailLog { id, applicationId FK, to, subject, body, sentAt, providerMsgId }
```

- One User has one active Profile (latest CV). History via version field.
- Job deduplicated by sourceUrl.
- Application is per User + Job.
- matchScore cached; invalidate if Profile or Job description changes.

## Module Boundaries

```text
app/api -> lib/scrapers -> no direct DB write without validation
lib/ai -> never logs secrets/cv raw beyond needed
components -> never import prisma directly (use server actions/api)
```

Rules:
- `lib/scrapers/*` pure parser: input HTML -> output Job fields. No fetch side-effect inside parser.
- `lib/ai/*` typed prompt & JSON schema output, cache aware.
- DB access only via Prisma; UI never runs raw SQL.
- Secrets via `process.env`, validated with Zod at startup.

## Auth & Multi-User

- NextAuth with PrismaAdapter.
- Protected routes via middleware.
- Every DB query scoped by `session.user.id` (never trust client id).
- Row-level: Application & Profile always filter by userId.

## CV Parse Pipeline

1. Upload via `app/api/cv/upload` (multipart, max 5MB, PDF only).
2. Save to `/tmp` or Supabase Storage.
3. `pdf-parse` extract text.
4. Heuristic + LLM extra step: skills & summary extraction.
5. Save to Profile.

## Job Fetch (Paste URL)

1. User paste URL -> `POST /api/jobs/fetch-url` {url}
2. Validate domain allowlist (`glints.com`, `jobstreet.co.id/.com`).
3. `fetch` with UA + timeout 10s.
4. Route to correct parser `lib/scrapers/glints.ts` or `jobstreet.ts`.
5. Return normalized Job JSON -> save.

Fallback if fetch blocked: return manual input form.

## AI Scoring

- Input: Profile.rawText + Job.description (truncated to 8000 chars).
- Prompt: system + JSON schema `{score, matched, missing, reason}`.
- Model: `gpt-4o-mini` or `gemini-2.0-flash`, temp 0.2.
- Cache key: hash(profileId + jobId + profileUpdatedAt).
- Store in Application.

## Email

- Provider: Resend. Domain verified.
- `POST /api/email/send` requires session + ownership check (Application belongs to user).
- Template plain text + optional HTML.
- Log to EmailLog.

## Performance & Limits

- PDF max 5MB, Job fetch timeout 10s.
- Cron (Fase 3) max tiap 6 jam, batch 20 jobs, backoff on 429.
- Rate limit per user untuk AI scoring (10/min).
