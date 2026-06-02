# Make It Art

Monorepo starter for the class project.

## Stack

- Frontend: Nuxt 3 + Tailwind CSS + Sass
- Backend: Node.js 22 + Express
- Data services: PostgreSQL 16 + Redis 7
- Infra: Docker Compose + Nginx for local dev + Caddy for production TLS
- CI/CD: GitHub Actions templates

## Project structure

- `frontend/` Nuxt app
- `backend/` Express API
- `infrastructure/` Docker, Nginx, scripts
- `.github/workflows/` CI/CD workflows
- `docs/` Team documentation and contribution log

## Docker compose location

This is intentional: the compose file is in `infrastructure/` to keep all infra files together.

Main file:

- `infrastructure/docker-compose.yml`

## Environment files

Use this file for local Docker runs:

- `infrastructure/.env`

Setup:

1. Copy `infrastructure/.env.example` to `infrastructure/.env`
2. Keep the default Docker values for local test, or update if needed
3. For the standard Docker workflow below, no extra host `.env` file is required

## Run local (Docker)

Recommended clean start for first setup, stale containers, missing dependencies, or after package changes:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml down -v --remove-orphans
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml build --no-cache backend frontend
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

The project also exposes workspace scripts:

```bash
npm run dev:up
npm run dev:up:build
```

Note: `npm run dev` and `npm run dev:build` run `quality:fix` before Docker, so they may rewrite files.

## Verify

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml ps
curl -i http://localhost:4000/health
curl -i http://localhost/api/health
curl -I http://localhost
```

Expected result: all responses are `200 OK` (or `301/302` for frontend depending on Nuxt redirect), and no `502`.

Useful local URLs:

- App through Nginx: `http://localhost`
- Frontend direct: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- Mailpit inbox: `http://localhost:8025`

## Production deployment

The repository now includes a dedicated production stack for `https://www.makeitart.io`:

- `backend/Dockerfile.prod`
- `frontend/Dockerfile.prod`
- `infrastructure/docker-compose.prod.yml`
- `infrastructure/Caddyfile`
- `infrastructure/.env.production.example`

Production uses Caddy as the public reverse proxy so HTTPS certificates for `makeitart.io` and `www.makeitart.io` can be issued automatically once DNS points to the VPS and ports `80` and `443` are open.

### VPS prerequisites

On the Debian VPS:

1. Install Docker Engine and Docker Compose plugin
2. Install Git
3. Point both `makeitart.io` and `www.makeitart.io` to the VPS public IP
4. Open ports `80` and `443` in the VPS firewall / security group

### Production environment

Create the production env file on the server:

```bash
cp infrastructure/.env.production.example infrastructure/.env.production
```

Then update at least these values:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Important production defaults:

- `APP_BASE_URL=https://www.makeitart.io`
- `CORS_ORIGIN=https://www.makeitart.io`
- `NUXT_PUBLIC_API_BASE=/api`

### Deploy on the VPS

From the repo root on the server:

```bash
npm run prod:build
npm run prod:up
```

Or without npm scripts:

```bash
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.prod.yml build --no-cache
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.prod.yml up -d
```

The backend production container runs Prisma migrations automatically on startup before launching the API.

### Production verify

```bash
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.prod.yml ps
docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.prod.yml logs -f proxy
```

Then verify:

- `https://www.makeitart.io`
- `https://www.makeitart.io/api/health`

Notes:

- First HTTPS certificate issuance can take a short time right after the first boot
- Production no longer uses Mailpit; email verification requires a real SMTP provider
- The production stack does not expose PostgreSQL or Redis publicly

## Lint and format

From repo root:

```bash
npm install
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Prisma

Prisma uses the schema file below as the single source of truth:

- `backend/prisma/schema.prisma`

The PostgreSQL database used by Prisma in local development is the Docker database defined in `infrastructure/docker-compose.yml`, exposed on `localhost:5432`.

### Recommended local Prisma workflow

1. Start Docker services:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

2. Apply migrations from inside the backend container:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml exec backend sh -lc "npx prisma migrate deploy --schema prisma/schema.prisma"
```

3. Check migration status if needed:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml exec backend sh -lc "npx prisma migrate status --schema prisma/schema.prisma"
```

4. Generate Prisma client if needed:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml exec backend sh -lc "npx prisma generate --schema prisma/schema.prisma"
```

This Docker-based Prisma flow is the most reliable local setup because it uses the backend container's own database connection and schema path.

### Host Prisma commands (optional)

If you prefer to run Prisma from the host machine instead of inside Docker:

1. Install the repo-root dependencies once:

```bash
npm install
```

2. Set `DATABASE_URL` in the same terminal:

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://mia:mia_dev_password@localhost:5432/makeitart"
```

Bash:

```bash
export DATABASE_URL="postgresql://mia:mia_dev_password@localhost:5432/makeitart"
```

3. Verify the connection string if needed:

PowerShell:

```powershell
echo $env:DATABASE_URL
```

Bash:

```bash
echo $DATABASE_URL
```

Expected value:

```text
postgresql://mia:mia_dev_password@localhost:5432/makeitart
```

### Common Prisma commands

From the host machine, use the repo-root schema path `backend/prisma/schema.prisma`.
Inside the backend container, use `prisma/schema.prisma`.

Read the existing database schema into Prisma:

```bash
npx prisma db pull --schema backend/prisma/schema.prisma
```

Generate the Prisma client:

```bash
npx prisma generate --schema backend/prisma/schema.prisma
```

Create and apply a local migration:

```bash
npx prisma migrate dev --schema backend/prisma/schema.prisma
```

Apply existing migrations:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

### Team conventions

- Use only `backend/prisma/schema.prisma`
- Do not recreate `prisma/schema.prisma`
- Prefer Prisma commands inside the backend container for local Docker development
- If tables were created manually in pgAdmin, use `db pull`
- If the Prisma schema becomes the source of truth, use `migrate dev`

### pgAdmin connection

Use these values in pgAdmin:

- Host: `localhost`
- Port: `5432`
- Database: `makeitart`
- Username: `mia`
- Password: `mia_dev_password`

### Troubleshooting Prisma connection

If Prisma tries to connect to `localhost:51214` or uses a `prisma+postgres://` URL, the wrong `DATABASE_URL` is being used. Redefine `DATABASE_URL` in the current terminal before running Prisma commands.

If Prisma returns `P1000`, the database credentials do not match the running local Postgres instance. In local Docker development, the fastest clean reset is:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml down -v --remove-orphans
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml build --no-cache backend frontend
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

If the app starts but registration fails on first use, apply Prisma migrations before testing auth flows:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml exec backend sh -lc "npx prisma migrate deploy --schema prisma/schema.prisma"
```

## Automation

Quality is automated at 3 levels:

- `npm run dev` and `npm run dev:build` run `quality:fix` automatically before Docker
- `pre-commit` git hook runs `npm run precommit` (strict check)
- `pre-push` git hook runs `npm run prepush` (same quality gate as CI)
- GitHub Actions CI runs lint + format check on `develop/main`

To enable hooks locally (one time):

```bash
npm install
```

Hooks are managed with Husky in `.husky/`.

## Troubleshooting network during npm install in Docker build

If npm registry times out, set a mirror in `infrastructure/.env`:

```bash
NPM_REGISTRY=https://registry.npmmirror.com
```

Then rebuild:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml build --no-cache backend frontend
```

Warnings such as `npm warn deprecated ...` during Docker build are usually non-blocking. Focus on actual build failures such as `ERROR`, `failed to solve`, or non-zero exit codes.

## Branch strategy

- `main`: production
- `develop`: integration
- `feature/*`: feature branches

Use pull requests to merge into `develop`, then `main`.

## Team documentation

- Activity log: `docs/TEAM_LOG.md`
- Entry template: `docs/TEAM_LOG_TEMPLATE.md`
- Technical decisions: `docs/DECISIONS.md`
