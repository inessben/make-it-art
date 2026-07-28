# Team Log

Chaque membre ajoute une entree apres son travail.

## Entrees

### 2026-XX-XX - Iness

- Branche: `feature/WGAC`
- Tache: Mise en conformite accessibilite du site et harmonisation de l'interface
- Fichiers modifies: composants et pages frontend, styles globaux, configuration Tailwind et tests d'accessibilite
- Impact:
  - Amelioration des contrastes, du focus visible, de la navigation clavier et de la hierarchie des titres
  - Ajout ou correction des labels, textes alternatifs, boutons accessibles et attributs ARIA utiles
  - Correction du comportement de la banniere de cookies et harmonisation visuelle de la page wallet
- Verification: lint, format, tests frontend/backend, typecheck et builds de production valides
- Blocages: Aucun

### 2026-XX-XX- Iness

- Branche: `feature/blockchain`
- Tache: Integration des wallets embarques Coinbase CDP sur le reseau Base
- Fichiers modifies: schema et migrations Prisma, services/routes wallet, configuration CDP, page wallet, composants et tests associes
- Impact:
  - Creation d'un wallet uniquement apres verification de l'email et consentement explicite
  - Authentification CDP par JWT/JWKS, creation idempotente, timeout, statut d'echec et relance securisee
  - Affichage de l'adresse publique, lien BaseScan et export securise de la cle sans exposition au backend
- Verification: tests wallet frontend/backend, 43 migrations Prisma, audits, CI et builds Docker de production valides
- Blocages: Aucun

### 2026-XX-XX - Iness

- Branche: `feature/SEO`
- Tache: Mise en place du referencement technique et des metadonnees du site
- Fichiers modifies: `frontend/nuxt.config.ts`, pages publiques, manifest, `robots.txt`, sitemaps et configuration Caddy
- Impact:
  - Ajout des metadonnees SEO et sociales sur les pages principales
  - Generation des sitemaps pages/images et declaration des regles d'indexation
  - Ajout du manifest web et amelioration des liens semantiques
- Verification: build Nuxt, lint, format et routes sitemap valides
- Blocages: Aucun

### 2026-XX-XX - Iness

- Branche: `feauture/analytics`
- Tache: Integration d'Umami et ajout des statistiques dans l'administration
- Fichiers modifies: composant analytics, dashboard admin, configuration Nuxt, variables d'environnement et proxy
- Impact:
  - Activation d'analytics respectueux du consentement utilisateur
  - Ajout d'un onglet de statistiques Umami dans le dashboard admin
  - Correction des erreurs ESLint et Prettier detectees par la CI
- Verification: lint, format, tests frontend et chargement conditionnel du suivi valides
- Blocages: Aucun

### 2026-XX-XX - Iness

- Branche: `feature/onlyFrontEnd`
- Tache: Realisation et harmonisation du frontend a partir des maquettes Figma
- Fichiers modifies: pages publiques, authentification, marketplace, compte, administration, composants partages, styles et configuration Tailwind
- Impact:
  - Creation des interfaces principales et des composants reutilisables
  - Harmonisation du header, footer, formulaires, cartes, etats de chargement et navigation responsive
  - Ajout des pages legales et de la gestion du consentement aux cookies
- Verification: controle visuel, lint, format et tests frontend valides
- Blocages: Aucun

### 2026-06-20 - Mariam

- Branche: `feature/admin`
- Tache: Mise en place du backoffice admin complet (UI + protection d'acces + pages branchees sur vraies donnees + compte admin de test)
- Fichiers modifies:
  - `frontend/data/admin-navigation.js`
  - `frontend/components/admin/AdminSidebar.vue`
  - `frontend/components/admin/AdminHeader.vue`
  - `frontend/components/admin/AdminShell.vue`
  - `frontend/pages/admin/index.vue`
  - `frontend/pages/admin/users.vue`
  - `frontend/pages/admin/artists.vue`
  - `frontend/pages/admin/artworks.vue`
  - `frontend/pages/admin/orders.vue`
  - `frontend/pages/admin/payments.vue`
  - `frontend/pages/forbidden.vue`
  - `frontend/middleware/admin.js`
  - `frontend/stores/auth.js`
  - `frontend/pages/[section].vue`
  - `backend/src/middlewares/admin-required.middleware.js`
  - `backend/src/routes/admin.routes.js`
  - `backend/src/routes/index.js`
  - `backend/src/routes/auth.routes.js`
  - `backend/src/repositories/user.repository.js`
  - `backend/src/repositories/artist.repository.js`
  - `backend/src/repositories/artwork.repository.js`
  - `backend/src/repositories/order.repository.js`
  - `backend/src/repositories/payment.repository.js`
  - `backend/src/services/default-admin.service.js`
  - `backend/src/services/two-factor-login.service.js`
  - `backend/src/server.js`
  - `backend/src/config/env.js`
  - `infrastructure/.env.example`
  - `infrastructure/.env.production.example`
- Impact:
  - Creation d'une vraie structure backoffice reutilisable a `/admin` avec sidebar, header et pages dediees
  - Protection d'acces admin cote frontend et backend avec redirection vers `/forbidden` pour les utilisateurs non admin
  - Correction de la route dynamique `[section].vue` qui capturait a tort `/admin`
  - Ajout des endpoints admin backend pour `dashboard`, `users`, `artists`, `artworks`, `orders` et `payments`
  - Branchement de toutes les pages admin sur les vraies donnees Prisma avec etats `loading`, `error`, `empty`, recherche simple et filtres de statut
  - Ajout d'un compte admin de test cree automatiquement en dev/test: `admin@art.com` / `admin123`
  - Activation d'un bypass du code email uniquement pour ce compte admin de test en environnement non production
  - Desactivation explicite du seed admin par defaut et du bypass login code dans l'exemple de config production
- Verification:
  - Test utilisateur normal: acces refuse a `/admin`
  - Test utilisateur admin: acces autorise a `/admin`
  - Verification des routes admin frontend: `/admin`, `/admin/users`, `/admin/artists`, `/admin/artworks`, `/admin/orders`, `/admin/payments`
  - Verification backend par `node --check` sur les nouveaux fichiers backend
  - Verification frontend par `eslint` sur les pages admin branchees
  - Verification Docker apres restart/rebuild: les pages admin sont bien chargees dans le conteneur frontend
  - Verification des logs backend: `[bootstrap] default admin ready: admin@art.com`
- Prochaine etape: ajouter les vraies actions admin (verification artiste, suspension user, moderation artwork, traitement remboursements/paiements) et affiner les permissions
- Blocages: le schema actuel ne porte pas encore de vrais statuts de moderation ni d'actions admin metier, donc certaines actions restent pour l'instant en lecture seule

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
