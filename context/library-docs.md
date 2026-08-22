# Library Docs

Records approved deps. Not substitute for official docs.

## Before Adding Dependency

1. Check skill/MCP docs.
2. Read official docs exact version.
3. Confirm existing dep insufficient.
4. Record here: package, version policy, purpose, constraints.

## Approved Stack

| Area | Decision | Notes |
|---|---|---|
| Framework | Next.js 16 App Router | SSR + API routes |
| Language | TypeScript strict | |
| DB | Prisma 7 + Postgres (Supabase) | SQLite fallback dev; requires `@prisma/adapter-pg` driver adapter (Prisma 7 client has no bundled engine) |
| Auth | NextAuth v5 (Auth.js) Credentials (email+password), JWT sessions | No PrismaAdapter (decision OD-005); Google/Email deferred |
| Styling | Tailwind v4 + shadcn/ui | Tokens only |
| Validation | Zod 3 | Env + request |
| CV Parse | pdf-parse 1.1.1 | PDF text extract (dynamic `import()` in Node runtime route) |
| Object Storage | minio 8.x | CV PDF blobs (S3-compatible, user-run MinIO); local-disk fallback when unset |
| Scraper MVP | cheerio 1.x | HTML parse |
| Scraper render | playwright 1.x (local Chromium) | Paste-URL fetch: native fetch dulu, fallback ke local headless browser bila 403/Cloudflare (Browserbase ditolak, tidak tersedia di Indonesia) |
| Scraper Fase 3 | playwright 1.x | On-demand headless render (search page) via `POST /api/jobs/search` — bukan cron |
| Deploy | Docker + Compose | `Dockerfile` + `docker-compose.yml` (`web` Traefik + `dev` hot reload), tanpa container Postgres (DB eksternal). Image install Chromium via `playwright install --with-deps`. Tidak ada service cron. |
| AI | OpenAI-compatible LLM (provider-agnostic) | DeepSeek/Groq/Ollama/OpenRouter via `LLM_BASE_URL`; NOT OpenAI/Gemini; heuristic fallback if no key |
| Email | resend 4.x | + nodemailer fallback |
| Kanban | @dnd-kit/core + sortable | Drag drop |
| Icons | lucide-react | |

## Selection Constraints

- Scraper: pure cheerio, no puppeteer in MVP.
- AI: temperature low (0.2), JSON mode, truncation.
- Email: verified domain, plain template first.
- pdf-parse: handle encrypted/locked PDF gracefully.

## Pending Template

```md
### package-name
- Version policy:
- Purpose:
- Why needed:
- Docs:
- Allowed modules:
- Prohibited:
- Verification:
```
