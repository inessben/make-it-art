# Make It Art

Monorepo starter for the class project.

## Stack

- Frontend: Nuxt 3 + Tailwind CSS + Sass
- Backend: Node.js 22 + Express
- Data services: PostgreSQL 16 + Redis 7
- Infra: Docker Compose + Nginx reverse proxy
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
2. Keep default values for local test, or update if needed

## Run local (Docker)

```bash
docker compose -f infrastructure/docker-compose.yml down -v --remove-orphans
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml build --no-cache
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

## Verify

```bash
docker compose -f infrastructure/docker-compose.yml ps
curl -i http://localhost:4000/health
curl -i http://localhost/api/health
curl -I http://localhost
```

Expected result: all responses are `200 OK` (or `301/302` for frontend depending on Nuxt redirect), and no `502`.

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

### Local Prisma setup

1. Start Docker services:

```bash
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml up -d
```

2. In the same terminal where you run Prisma commands, set `DATABASE_URL` to the local Docker Postgres instance:

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
- Use the local Docker Postgres database for Prisma commands
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
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml build --no-cache
```

## Branch strategy

- `main`: production
- `develop`: integration
- `feature/*`: feature branches

Use pull requests to merge into `develop`, then `main`.

## Team documentation

- Activity log: `docs/TEAM_LOG.md`
- Entry template: `docs/TEAM_LOG_TEMPLATE.md`
- Technical decisions: `docs/DECISIONS.md`
