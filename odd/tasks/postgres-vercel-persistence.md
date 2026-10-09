# PostgreSQL persistence for Vercel and Dokploy

## Objective
Replace local SQLite persistence with managed PostgreSQL so Digger can run on Vercel and Dokploy using `DATABASE_URL`.

## Problem and rationale
`lib/db.ts` stores SQLite at `data/digger.db`, which assumes writable persistent local storage and is unsuitable for ephemeral/serverless deployment. User selected managed PostgreSQL, provider-neutral connection configuration, and a fresh database (no SQLite data transfer).

## Scope and constraints
- Keep existing game/API semantics and PostgreSQL provider agnostic; use `DATABASE_URL`.
- Include schema migrations and practical deployment instructions for Vercel and Dokploy.
- Do not deploy infrastructure or access external accounts/VPS; user configures the managed database and secret.
- Preserve existing configuration-row behavior unless implementation requires otherwise; do not silently migrate old records.
- Remove SQLite runtime dependencies/assumptions.

## Tasks
- [x] T1: Replace SQLite with a PostgreSQL persistence layer and migrate repositories/API handlers.
- [x] T2: Add schema migration tooling and document setup for Vercel and Dokploy.
- [x] T3: Add Docker Compose and container build for app + PostgreSQL, with persistent DB storage and automatic migrations.
- [x] T4: Include the PostgreSQL driver in the standalone runtime image for the migration script.
- [ ] T5: Rebuild and verify container startup, migration, and persistence behavior; record limitations/evidence.

## Acceptance criteria
- All current player, score, and configuration API flows use PostgreSQL through `DATABASE_URL`.
- Schema is created through an explicit migration step suitable for both deployment platforms.
- No application runtime path depends on SQLite or a writable deployment filesystem.
- Documentation explains database/provider setup, `DATABASE_URL`, and migration invocation.
- Applicable checks pass; any unavailable database-backed check is disclosed.

## Progress and evidence
- Exploration: SQLite connection is centralized in `lib/db.ts`; three repositories own SQL; API routes consume those repositories. No test suite was found. User chose managed PostgreSQL and confirmed existing SQLite records need not be preserved.
- T1: PostgreSQL client, async repositories/API operations, and PostgreSQL schema migration added; configuration reads/updates still target the highest-id row without adding uniqueness.
- T2: Explicit SQL migration runner and Vercel/Dokploy `DATABASE_URL` instructions added. Fresh database only; no data migration.
- T3: Added production multi-stage Dockerfile with Next standalone output; Compose defines app and internal PostgreSQL, DB healthcheck/healthy dependency, named persistent volume, and migration-before-start. README documents Git repository/domain/secrets setup in Dokploy UI. `.env.example` creation was blocked by tool sensitive-path protection despite explicit approval; Compose placeholders are documented and passwords are not embedded. Compose interpolation support depends on Dokploy passing UI variables to the Compose parser. Implementation commit: `735e07d` (`feat: add PostgreSQL and Dokploy deployment`), pushed to `origin/master`. No Dokploy deployment was performed.
- T4: Dokploy logs show `ERR_MODULE_NOT_FOUND` for package `postgres` imported from `/app/scripts/migrate.mjs`. Local reproduction confirmed `node_modules/postgres` exists in the workspace but is absent from `.next/standalone/node_modules`. Updated the final runner stage to copy `/app/node_modules/postgres` from the dependencies stage to `/app/node_modules/postgres`. Node's package resolution from `/app/scripts/migrate.mjs` searches `/app/node_modules`, so the migration script can resolve the package. Image rebuild/startup has not yet been verified.
- T5: Prior independent checks passed Compose config, lint, typecheck, Next build, and diff check. Docker daemon access was denied; no live PostgreSQL check is available yet. `.env.example` remains unavailable due file protection. Live timestamp serialization still needs validation. Rebuild the image and verify migration/startup and route persistence when Docker/database access is available.
