# JobHunter Agent Guide

JobHunter adalah web app pribadi untuk mencari pekerjaan di Indonesia — mulai dari analisis CV, rekomendasi lowongan (Glints & Jobstreet), hingga tracking progress lamaran. Stack: Next.js 16, React, TypeScript, Prisma 7, Postgres, NextAuth.

## Development Environment

- Linux/WSL OK. Semua command Node/Next bisa jalan di WSL atau native Windows via `powershell.exe -NoProfile`.
- Package manager: yarn (prefer). Verifikasi via `yarn --version` sebelum install.
- DB: Postgres via Supabase (prod) / Docker / SQLite fallback untuk dev cepat.
- Env: copy `.env.example` ke `.env` sebelum run.

## Setup Rules

- **JANGAN buat file manual jika ada CLI resmi.** Selalu pakai command generator resmi daripada `write`/`edit` manual.
  - Next.js: `yarn create next-app@latest` / `npx create-next-app@latest` (jangan bikin `package.json`, `next.config`, `app/` manual)
  - Tailwind: `yarn dlx tailwindcss init`, shadcn: `yarn dlx shadcn@latest init / add`
  - Prisma: `yarn dlx prisma init`, `prisma migrate dev`
  - Auth: `yarn dlx auth` jika tersedia, ESLint: `yarn create @eslint/config`
- Jika CLI meminta interaktif, pakai flags non-interaktif (`--yes`, `--typescript`, `--tailwind`, `--app`, `--eslint`, `--src-dir false`).
- Hanya edit manual setelah scaffold CLI selesai — untuk menyesuaikan tokens, config, dan integrasi.

## Read Before Implementation

Read in this exact order:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/trust-model.md`
4. `context/versioning.md`
5. `context/code-standards.md`
6. `context/library-docs.md`
7. `context/compatibility.md`
8. `context/open-decisions.md`
9. `context/build-plan.md`
10. `context/progress-tracker.md`
11. Active feature spec under `context/features/`
12. ADRs directly referenced by active feature under `context/decisions/`

For UI work, also read before editing:

1. `context/ui-tokens.md`
2. `context/ui-rules.md`
3. `context/ui-registry.md`
4. `design-system/jobhunter/MASTER.md` (design system master, generated via `ui-ux-pro-max` skill)
5. Load `ui-ux-pro-max` skill before any UI design/implementation/review

> **Design System Rule:** WAJIB load skill `ui-ux-pro-max` sebelum mengerjakan UI. Pilih style modern untuk dashboard (shadcn allowed) tapi JANGAN copy `../nerd/prototype` — palette, typography, dan layout JobHunter harus baru (lihat `ui-tokens.md` & `MASTER.md`). Search via `scripts/search.py --design-system` dengan query spesifik jobhunter.

Do not read every feature spec by default. Read active feature + dependencies listed inside it. Use `build-plan.md` and `progress-tracker.md` to find active feature.

Do not read every ADR. Read `decisions/README.md`, then only ADRs referenced by active feature.

Post-MVP lives in `context/roadmap.md` and `context/features/post-mvp/`. Do not implement unless promoted.

## Feature Workflow

1. Confirm active feature in `progress-tracker.md`.
2. Read its complete file under `context/features/`.
3. Load `/architect` before changing architecture/scope.
4. Verify installed library docs before code.
5. Implement only in-scope behavior.
6. Run feature acceptance tests (`yarn test`, `yarn lint`, `yarn build`).
7. Load `/review` before marking complete.
8. Update feature spec if decision changed.
9. Update `progress-tracker.md` after status change.
10. Update `ui-registry.md` after reusable UI additions via `/imprint`.

## Invariants

- Web-first, responsive + PWA. Mobile-friendly but no native app in MVP.
- Multi-user via NextAuth (email + Google OAuth). Single-user mode via fallback.
- CV: upload PDF only (MVP). Parsing via `pdf-parse`, no OCR di MVP.
- Job sources MVP: Glints & Jobstreet via paste-URL fetch (cheerio). Auto-scrape cron adalah Fase 3, bukan MVP blocking.
- Semi-auto apply: tracking + email (Resend). Tidak ada auto-apply bot yang login ke portal pihak ketiga.
- Matching: LLM scoring (OpenAI/Gemini) — score 0-100 + matched/missing skills. Cache result per profile+job.
- Email: Resend / Nodemailer. Template plain, tidak masuk spam trigger.
- No filesystem polling. Scraper pakai cron, bukan watcher.
- No hardcoded colors / raw Tailwind palette di components — pakai tokens `ui-tokens.md` + `design-system/jobhunter/MASTER.md`.
- Secrets (API keys, Resend key) via `.env` + never log.
- Scraping hormati robots.txt & rate limit; handle HTML change gracefully (parser modular).
- Product releases SemVer; DB migrations independent version.
- Every commit Conventional Commits 1.0.0.
- Jangan pakai polling brutal ke Glints/Jobstreet — max cron 6 jam, dengan backoff.

## Dependency Rules

Before adding crate/npm package:

1. Load matching skill if available.
2. Read official docs for exact version.
3. Read `context/library-docs.md`.
4. Confirm stdlib/existing dep insufficient.
5. Record approved dep + constraints in `library-docs.md`.

## Git Rules

- Trunk-based, `main` releasable.
- Branch: `feat/<short-name>`, `fix/<short-name>`, etc. (see `versioning.md`)
- Never commit directly to `main` after bootstrap — via PR.
- Required checks (lint/type/test/build) must pass before merge.
- One logical change per commit, Conventional Commits.
- Tags `vX.Y.Z` immutable annotated.

## Failure And Recovery

- After 1 failed fix for same root cause, load `/recover`.
- Never destructive git/fs to recover unrelated work.
- Probe first, mutate second, verify postconditions.

## Available Skills

- `/architect`: before complex feature/arch change.
- `/imprint`: after reusable UI component.
- `/review`: before marking feature complete.
- `/recover`: after failed corrective attempt.
- `/remember save` / `/remember restore`: multi-session work.
