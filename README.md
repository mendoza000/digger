# Digger

Digger is a Next.js game application. Install dependencies with `npm ci`, then use `npm run dev` for local development.

## Managed PostgreSQL setup

The application requires a managed PostgreSQL database and `DATABASE_URL`; SQLite and local-file persistence are no longer used. Create a fresh database with your preferred PostgreSQL provider and configure its connection URL as a server-side secret. The database must accept TLS if required by its provider. No existing SQLite data is migrated.

Apply schema migrations before starting or deploying the application:

```bash
DATABASE_URL='postgresql://user:password@host:5432/database?sslmode=require' npm run db:migrate
```

The migration runner applies sorted `.sql` files from `migrations/` once and records them in `schema_migrations`. Run it again after adding future migrations. The app does not modify schema at startup.

### Vercel

1. Create a managed PostgreSQL database with your chosen provider.
2. Add `DATABASE_URL` under the Vercel project's Environment Variables for every deployed environment.
3. From a trusted environment, run `npm ci` and `npm run db:migrate` with that environment's `DATABASE_URL` before serving application traffic. Do not expose the URL in build logs or client-side variables.
4. Deploy the Next.js application normally. Runtime connections use a serverless-compatible PostgreSQL client and a small per-instance pool.

### Dokploy

This repository includes `docker-compose.yml` and a production `Dockerfile` for deploying the app with its own PostgreSQL service. The database is reachable only on the Compose network (no published database port), and its data persists in the `postgres_data` named volume. The app waits for PostgreSQL's healthcheck, runs `scripts/migrate.mjs` before starting Next.js, and listens on internal port `3000` for Dokploy's proxy.

1. In Dokploy, create an application from this Git repository and select the Compose deployment using `docker-compose.yml`. A Git repository connection and successful build/deploy are configured in Dokploy's UI; they cannot be supplied by this Compose file.
2. In Dokploy's environment-variable UI, set `POSTGRES_PASSWORD` to a long, random **alphanumeric** password, plus any desired `POSTGRES_DB` and `POSTGRES_USER` values. Do not commit real credentials or rely on `.env.example` for production secrets.
3. Configure the app's Dokploy domain/proxy to route to service `app`, port `3000`; domain and TLS setup require the Dokploy UI. Do not publish the `db` service port.
4. Redeploy. Compose interpolates the database variables into `DATABASE_URL` using the internal hostname `db`; migrations run in the app container before the server starts. No separate migration command is needed.

Compose `${VAR}` interpolation is performed by the Compose implementation before containers start. Dokploy's environment UI must provide variables to Compose interpolation for this file to work; a service/container-level environment setting applied only after interpolation is insufficient. Dokploy versions/configurations may vary, so confirm its Compose environment-variable behavior. Passwords containing URL-special characters must be percent-encoded for the URL; the alphanumeric password recommendation avoids that complication.

Keep the database URL server-side, use credentials scoped to the application, and enable provider-managed backups as appropriate. See the [Next.js deployment documentation](https://nextjs.org/docs/app/building/your-application/deploying) for platform details.
