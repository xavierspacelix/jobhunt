# Versioning

## Source

- Git trunk-based, `main` releasable.
- Branch: `feat/<short>`, `fix/<short>`, `docs/<short>`, etc.
- No direct commit to `main` post-bootstrap — via PR.
- PR must pass lint/type/test/build.

## Commits

Conventional Commits 1.0.0.

- `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:`
- Scopes: `auth`, `cv`, `scraper`, `tracker`, `ai`, `email`, `ui`, `db`, `docs`
- One logical change per commit.

## Application Version

SemVer 2.0.0 `MAJOR.MINOR.PATCH[-PRERELEASE]`.

- Source of truth: `package.json` version.
- Every release: tag `vX.Y.Z` annotated.

## Internal Versions

- Prisma migrations ordered, immutable, forward-only.
- No coupling app version to DB migration.
- Breaking DB change via new migration, not edit old.

## Release Flow

1. Update `package.json` version.
2. Run full checks.
3. `chore(release): prepare vX.Y.Z`
4. Tag `vX.Y.Z` -> build image dan deploy melalui environment Docker/Traefik.

Belum ada workflow release/deploy otomatis di repository. CI memverifikasi
Prisma schema/migrations, lint, typecheck, test dengan PostgreSQL, dan build.
Format check, Docker image smoke, dan browser E2E belum menjadi gate.
