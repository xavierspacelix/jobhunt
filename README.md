# JobHunter

JobHunter adalah web app pribadi untuk menganalisis CV, mengimpor dan mencari
lowongan Glints/Jobstreet, menilai kecocokan, serta melacak progres lamaran.

## Requirements

- Node.js 24
- Yarn 1.22.22
- PostgreSQL
- Optional MinIO for durable CV storage
- Optional OpenAI-compatible LLM endpoint
- Chromium dependencies are installed automatically in Docker

## Local Setup

```bash
cp .env.example .env
yarn install --frozen-lockfile
yarn prisma generate
yarn prisma migrate dev
yarn db:seed
yarn dev
```

Open `http://localhost:3000`. The development seed creates
`demo@jobhunter.dev` with password `demopassword`; do not use this seed as an
unreviewed production bootstrap.

Without MinIO, CV files are stored under `uploads/cvs`. The Docker deployment
mounts this directory to a named volume; MinIO remains recommended for durable
production storage.

## Configuration

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` in production

Optional:

- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
- `MINIO_*`
- `RATE_LIMIT_*`

See `.env.example` and `context/library-docs.md`. Dedicated OpenAI/Gemini SDKs
and email sending are not implemented.

## Verification

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

## Docker Deployment

`docker-compose.yml` expects an external Traefik network named
`traefik-public`, an external PostgreSQL database, and optionally external
MinIO.

```bash
docker compose up --build -d
docker compose run --rm web yarn prisma migrate status
```

The container runs migrations before starting Next.js, installs Chromium for
scraper fallback, runs as a non-root user, and persists local fallback uploads.

## Chrome Extension

Authenticated users can download the Manifest V3 extension from the dashboard.
It hands a Glints/Jobstreet tab URL to `/jobs` for preview and explicit save; it
does not hold credentials or write directly to the API.

Rebuild its artifact with:

```bash
bash scripts/build-extension.sh
```

## Documentation

Start with `AGENTS.md`, then follow its ordered reading list under `context/`.
Feature specs are the scope source of truth.
