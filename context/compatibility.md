# Compatibility

## Browsers

- Chrome / Edge latest two versions
- Firefox latest two versions
- Safari latest two versions
- Responsive mobile Chrome/Android and Safari/iOS
- PWA/offline support is not implemented

## Runtime and Packages

- Node 24 in Docker and CI
- Yarn Classic 1.22.22 (`packageManager` source of truth)
- Next.js 16.3.2, React 19.2.8, TypeScript 5 strict
- `package.json` enforces Node `>=24 <25`; no `.nvmrc`/`.node-version`

## Database

- PostgreSQL only through Prisma 7 and `@prisma/adapter-pg`
- External DB configured by `DATABASE_URL`
- No SQLite datasource or provider-switch fallback exists

## External Sources

- Glints: `glints.com`, including locale/subdomains allowed by URL validation
- Jobstreet: `jobstreet.co.id` and `jobstreet.com`, including subdomains
- DNS-pinned native HTML fetch with Playwright Chromium fallback; HTTPS only,
  same source across redirects, browser resources same-origin only
- HTML and anti-bot behavior can change; parsers must fail gracefully

## AI

- OpenAI-compatible Chat Completions HTTP API configured by `LLM_BASE_URL`,
  `LLM_API_KEY`, and optional `LLM_MODEL`
- Known-compatible providers include DeepSeek, Groq, OpenRouter, and Ollama when
  they expose the expected endpoint/JSON behavior
- No provider SDK is installed; OpenAI and Gemini are not dedicated integrations
- Heuristic fallback is used when config is absent or an AI operation fails

## Storage and Email

- MinIO 8-compatible S3 API for durable CV blobs
- Local `uploads/cvs` fallback uses UUID-versioned active objects and is mounted
  to a named Compose volume; MinIO is preferred for object storage
- Resend/email sending is deferred; env placeholders and `EmailLog` schema do
  not constitute an implemented integration

## Hosting

- Docker image based on `node:24-slim`
- Compose production service behind an external Traefik network
- External PostgreSQL and optional MinIO
- Startup applies migrations, then runs non-root with DB-aware healthcheck;
  Traefik request bodies are capped at 6 MiB
- No Vercel configuration, scheduled cron, or Compose dev service

## Extension

- Chrome and Edge extension uses Manifest V3; Firefox is not claimed.
- Bundled manifest key stabilizes extension ID
  `lokhjkfokakakehiojciicjhfokmkldg`; production identity is not claimed as Chrome
  Web Store signing until the package is published there.
- The release extension is locked to `https://jobhunt.spacelix.qzz.io`; there is
  no end-user connection setting. `yarn extension:dev` generates a localhost-only
  unpacked build under `.artifacts/`; it cannot be installed beside production
  because both builds share an ID. Dashboard detection is current-browser only.
- The ZIP is a generated deployment artifact and can be rebuilt with
  `bash scripts/build-extension.sh`.
