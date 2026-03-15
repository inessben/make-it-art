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
