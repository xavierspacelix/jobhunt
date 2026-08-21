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
| DB | Prisma 7 + Postgres (Supabase) | SQLite fallback dev |
| Auth | NextAuth v5 (Auth.js) + PrismaAdapter | Email + Google |
| Styling | Tailwind v4 + shadcn/ui | Tokens only |
| Validation | Zod 3 | Env + request |
| CV Parse | pdf-parse 1.x | PDF text extract |
| Scraper MVP | cheerio 1.x | HTML parse, fetch native |
| Scraper Fase 3 | playwright 1.x | Cron headless |
| AI | Vercel AI SDK + openai | Scoring & cover letter |
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
