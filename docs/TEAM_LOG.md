# Team Log

Chaque membre ajoute une entree apres son travail.

## Entrees

### 2026-06-08 - Mariam

- Branche: `feature/env-prod`
- Tache: Preparation de la mise en production sur VPS Hostinger avec domaine `makeitart.io`
- Fichiers modifies:
  - `backend/Dockerfile.prod`
  - `frontend/Dockerfile.prod`
  - `infrastructure/docker-compose.prod.yml`
  - `infrastructure/Caddyfile`
  - `infrastructure/.env.production.example`
  - `package.json`
  - `README.md`
- Impact:
  - Ajout d'une stack Docker de production separee de l'environnement local
  - Configuration du reverse proxy HTTPS avec Caddy pour `makeitart.io` et `www.makeitart.io`
  - Prise en charge d'un vrai SMTP Hostinger pour les emails de verification
  - Ajout de scripts `prod:*` pour build, lancement, logs et arret
- Verification:
  - Deploiement manuel sur le VPS Debian avec `docker compose --env-file infrastructure/.env.production -f infrastructure/docker-compose.prod.yml up -d`
  - Caddy a obtenu les certificats Let's Encrypt pour `makeitart.io` et `www.makeitart.io`
  - Backend `healthy` et endpoint `https://www.makeitart.io/api/health` accessible
- Prochaine etape: stabiliser le flux de redeploiement automatique depuis GitHub Actions
- Blocages: conflit initial avec Nginx sur le port 80 et configuration DNS Docker a corriger pour l'emission des certificats

### 2026-06-08 - Mariam

- Branche: `feature/env-prod`
- Tache: Mise en place du deploiement automatique GitHub Actions vers le VPS de production
- Fichiers modifies:
  - `.github/workflows/ci.yml`
  - `.github/workflows/cd-production.yml`
  - `README.md`
- Impact:
  - La CI tourne sur `develop` et `main`
  - Ajout d'un workflow `CD Production` pour deployer la branche `main` sur le VPS via SSH
  - Le workflow cible `/root/make-it-art` et relance la stack prod avec `infrastructure/.env.production`
- Verification:
  - Generation d'une cle SSH dediee `github-actions-deploy`
  - Cle publique ajoutee sur le VPS et test de connexion SSH reussi avec `root@187.77.169.141`
  - Secrets GitHub `PRODUCTION_SSH_HOST`, `PRODUCTION_SSH_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_SSH_PORT` et variable `PRODUCTION_APP_DIR` configures sur le bon repo
- Prochaine etape: merger la version corrigee du workflow sur `main` puis valider un premier deploiement automatique complet
- Blocages: ancien workflow encore present sur GitHub, conflit de merge dans `cd-production.yml` et format de cle SSH a fiabiliser dans le runner GitHub

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Correction des hooks Husky pour Git Bash + nvm4w (fallback `npm.cmd`)
- Fichiers modifies:
  - `.husky/pre-commit`
  - `.husky/pre-push`
- Impact:
  - Les commits/push ne bloquent plus sur l'erreur `/bin/bash: C:/nvm4w/nodejs/npm: No such file or directory`
- Verification:
  - Hooks utilisent `npm` si disponible, sinon `npm.cmd`
- Prochaine etape: commit de la base projet
- Blocages: Aucun

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Automatisation du quality gate avant demarrage + correction cross-platform Prettier
- Fichiers modifies:
  - `package.json`
  - `.prettierrc.json`
  - `README.md`
- Impact:
  - `npm run dev` et `npm run dev:build` appliquent automatiquement `lint:fix + format`
  - Plus de blocage sur differences d'EOL Windows/WSL (`endOfLine: auto`)
- Verification:
  - Le blocage precedent sur `format:check` est contourne par `quality:fix` avant lancement
- Prochaine etape: relancer `npm run dev:build` puis verifier endpoints
- Blocages: Aucun

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Correction ESLint Nuxt pour permettre `npm run dev:build` sans faux positifs
- Fichiers modifies:
  - `frontend/.eslintrc.cjs`
- Impact:
  - Les auto-imports Nuxt (`useRuntimeConfig`, `useFetch`, etc.) ne bloquent plus `npm run lint`
  - Le quality gate n'empeche plus le demarrage Docker pour cette cause
- Verification:
  - Erreurs precedentes ESLint sur `frontend/pages/index.vue` corrigees par la config globals
- Prochaine etape: Relancer `npm run dev:build` puis tests HTTP
- Blocages: Aucun

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Ajout de l'automatisation qualite et documentation complete
- Fichiers modifies:
  - `package.json` (scripts quality + hooks + husky)
  - `backend/package.json` (eslint/prettier scripts)
  - `frontend/package.json` (eslint/prettier scripts + TS eslint deps)
  - `frontend/.eslintrc.cjs` (parser vue + typescript)
  - `.husky/pre-commit`
  - `.husky/pre-push`
  - `README.md`
  - `docs/README.md`
  - `docs/DECISIONS.md`
  - `docs/TEAM_LOG.md`
- Impact:
  - Lint/format automatises avant commit, avant push, et avant lancement `npm run dev`
  - Documentation centralisee pour toute l'equipe
- Verification:
  - API directe: `curl -i http://localhost:4000/health` -> 200
  - API via proxy: `curl -i http://localhost/api/health` -> 200
  - Front via Nginx: `curl -I http://localhost` -> 200
- Prochaine etape: Installer dependances root (`npm install`) pour activer Husky sur chaque poste
- Blocages: warnings npm `deprecated` non bloquants

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Stabilisation complete du lancement local Docker/Nginx
- Fichiers modifies:
  - `infrastructure/docker-compose.yml`
  - `infrastructure/nginx/default.conf`
  - `infrastructure/.env.example`
  - `frontend/Dockerfile`
  - `backend/Dockerfile`
  - `frontend/.dockerignore`
  - `backend/.dockerignore`
- Impact:
  - Build resilients aux timeouts npm
  - Front + back demarrent correctement derriere Nginx
  - Plus de 502 sur `/api/health` et `/`
- Verification:
  - `docker compose ... ps` -> services `healthy`
  - `curl -i http://localhost:4000/health` -> 200
  - `curl -i http://localhost/api/health` -> 200
  - `curl -I http://localhost` -> 200
- Prochaine etape: Protection des branches GitHub (`main`, `develop`) + premiers PR features
- Blocages: ETIMEDOUT npm resolu avec retries + NPM_REGISTRY configurable

### 2026-03-15 - Mariam

- Branche: `develop`
- Tache: Bootstrap monorepo et infra locale
- Fichiers modifies:
  - `frontend/*`
  - `backend/*`
  - `infrastructure/*`
  - `.github/workflows/*`
- Impact: Projet lancable en local avec Docker + Nginx
- Verification:
  - `curl -i http://localhost:4000/health` -> 200
  - `curl -i http://localhost/api/health` -> 200
  - `curl -I http://localhost` -> 200
- Prochaine etape: Repartition des features en branches `feature/*`
- Blocages: Aucun

---

Ajoute les nouvelles entrees au-dessus de cette ligne.
