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
| DB | Prisma 7.9 + PostgreSQL + `@prisma/adapter-pg` | PostgreSQL only; external DB via `DATABASE_URL`; no SQLite fallback |
| Auth | NextAuth v5 (Auth.js) Credentials (email+password), JWT sessions | No PrismaAdapter (decision OD-005); Google/Email deferred |
| Styling | Tailwind v4 + shadcn `base-nova` + Base UI | CSS-first config, tokens only, next-themes |
| Validation | Zod 3 | Env + request |
| CV Parse | pdf-parse 1.1.1 | PDF text extract (dynamic `import()` in Node runtime route) |
| Object Storage | minio 8.x | CV PDF blobs (S3-compatible, user-run MinIO); local-disk fallback when unset |
| Scraper parse | cheerio 1.x | Pure JSON-LD/DOM parsing after HTML retrieval; does not execute pages |
| Scraper render | playwright 1.x (local Chromium) | Fallback only after pinned native fetch fails/is blocked; exact-host DNS pin and same-origin resource policy. Browserbase rejected |
| On-demand search renderer | playwright 1.x | Headless render via `POST /api/jobs/search`; no scheduler/cron |
| Extension | Chrome/Edge Manifest V3, no npm runtime | `activeTab`, `scripting`, `storage`, `identity`; DOM preview, PKCE direct-save, external install handshake, generated ZIP |
| Deploy | Docker + Compose | Node 24, automatic migrations, non-root runtime, healthcheck, persistent local-upload volume, external Traefik/Postgres/optional MinIO; no cron |
| AI | OpenAI-compatible HTTP API (provider-agnostic) | Direct `fetch` ke `/chat/completions` via `LLM_BASE_URL`; no provider SDK; heuristic fallback |
| Email | Deferred, no package installed | `EmailLog` schema dan env placeholder ada; Resend/Nodemailer belum diimplementasikan |
| Kanban | @dnd-kit/core + sortable | Drag drop |
| Icons | lucide-react | |

## Selection Constraints

- Scraper: Cheerio parses HTML; Playwright is a bounded browser fallback, not the parser.
- AI: temperature low (0.2), JSON mode, truncation.
- Email: verified domain, plain template first.
- pdf-parse: handle encrypted/locked PDF gracefully.
- Runtime/package manager: package engine `>=24 <25`, Node 24 in Docker/CI,
  Yarn 1.22.22. Next instrumentation performs Node-runtime env validation.

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
