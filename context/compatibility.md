# Compatibility

## Browsers (MVP)

- Chrome / Edge latest 2 versions
- Firefox latest 2
- Safari latest 2 (desktop + iOS PWA later)
- Mobile Chrome/Android, Safari iOS responsive required

## Node & Package

- Node 20 LTS (Vercel default)
- yarn 4 (classic 1.22 acceptable)

## DB

- Postgres 15+ (Supabase)
- SQLite 3 for local dev (Prisma)

## External Sources

- Glints (`glints.com/id`, `glints.com/id/en`): HTML may change → parser modular, manual fallback
- Jobstreet (`jobstreet.co.id`, `id.jobstreet.com`): same
- Allowlist domains enforced; unknown domains rejected

## Email

- Resend API, domain DNS verified (SPF/DKIM)
- Fallback: Gmail SMTP via Nodemailer if Resend unavailable

## AI

- OpenAI gpt-4o-mini (primary) / Gemini 2.0 Flash (alt)
- JSON output, fallback to text parse

## Hosting

- Vercel (Next.js), cron via vercel.json (Fase 3)
