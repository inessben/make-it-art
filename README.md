# Make It Art

Make It Art est une marketplace d’art numérique destinée aux artistes, collectionneurs et administrateurs. Le projet couvre désormais l’ensemble du parcours métier : publication et protection des œuvres, découverte des artistes, panier et paiement Stripe, licences d’utilisation, commandes et factures, espace artiste, administration, consentement analytique et portefeuille intégré sur Base.

Ce dépôt est un monorepo Docker composé d’un frontend Nuxt, d’une API Node.js, d’une base PostgreSQL, de Redis et des services d’exploitation nécessaires au développement et à la production.

## Fonctionnalités actuelles

### Visiteurs et membres

- inscription par e-mail et connexion Google OAuth 2.0 ;
- vérification de l’adresse e-mail, récupération du mot de passe et code de connexion renforcée ;
- catalogue d’œuvres et d’artistes, recherche, catégories et collections ;
- favoris, abonnements, notifications, profil et paramètres du compte ;
- panier, commande, paiement Stripe, moyens de paiement enregistrés et historique ;
- téléchargement sécurisé après achat et consultation des factures ;
- consentement explicite aux cookies analytiques ;
- création facultative d’un portefeuille Coinbase CDP sur le réseau Base après vérification de l’e-mail et consentement explicite.

### Artistes

- candidature, contrat et validation administrative ;
- profil public et tableau de bord ;
- création, modification, publication, masquage, archivage et restauration des œuvres ;
- licences personnelle, commerciale et exclusive ;
- suivi des ventes, revenus et demandes de retrait ;
- protection des fichiers : aperçus contrôlés, filigrane et métadonnées de traçabilité.

### Administration

- tableaux de bord et indicateurs ;
- gestion des utilisateurs, artistes, candidatures, œuvres et catégories ;
- supervision des commandes, paiements, remboursements et litiges ;
- journal d’audit et opérations financières idempotentes ;
- suivi analytique respectueux du consentement avec Umami.

## Architecture technique

| Couche | Technologies principales |
| --- | --- |
| Frontend | Nuxt 4, Vue 3, Pinia, Tailwind CSS 3, Sass |
| Backend | Node.js 22, Express, Prisma 7, API REST documentée avec OpenAPI |
| Données | PostgreSQL 16, Redis 7 |
| Paiement | Stripe Checkout, webhooks signés, remboursements et rapprochement |
| Blockchain | Coinbase Developer Platform, portefeuille intégré non custodial, réseau Base |
| Analytique | Umami, chargé uniquement après consentement |
| Infrastructure | Docker Compose, Nginx en local, Caddy en production |
| Qualité | ESLint, Prettier, tests Node, audits npm, GitHub Actions |

## Organisation du dépôt

```text
make-it-art/
├── backend/          API Express, schéma Prisma, migrations et tests
├── frontend/         application Nuxt, pages, composants et tests
├── infrastructure/   configurations Docker, proxy et environnements exemples
├── docs/             documentation fonctionnelle, technique et QA
├── .github/          workflows CI/CD et automatisations
├── tmp_sujet_web.txt exigences pédagogiques d’origine
└── package.json      commandes communes du monorepo
```

## Démarrage local

### Prérequis

- Docker Desktop avec Docker Compose ;
- Git ;
- Node.js 22 uniquement pour exécuter certaines commandes hors conteneur.

### Installation

```bash
git clone <URL_DU_DEPOT>
cd make-it-art
cp infrastructure/.env.example infrastructure/.env
npm run dev:up:build
```

Sous PowerShell :

```powershell
Copy-Item infrastructure/.env.example infrastructure/.env
npm run dev:up:build
```

Les secrets réels restent exclusivement dans les fichiers `.env` non suivis par Git ou dans les secrets de l’environnement de déploiement.

### Services locaux

| Service | Adresse |
| --- | --- |
| Application | <http://localhost> |
| Frontend direct | <http://localhost:3000> |
| API | <http://localhost:4000/api> |
| Documentation OpenAPI | <http://localhost:4000/api/docs> |
| Mailpit | <http://localhost:8025> |

## Commandes principales

```bash
npm run dev:up           # démarrer l’environnement local
npm run dev:up:build     # reconstruire puis démarrer
npm run dev:logs         # suivre les journaux
npm run dev:down         # arrêter les services
npm test                 # lancer les tests du monorepo
npm run test:coverage    # générer la couverture
npm run lint             # vérifier le lint
npm run format:check     # vérifier le formatage sans modifier les fichiers
npm run quality          # exécuter les contrôles de qualité
npm run ci               # reproduire les contrôles CI disponibles localement
npm run security:audit   # auditer les dépendances
npm run prod:build       # construire les images de production
```

Les scénarios Stripe détaillés sont centralisés dans [le guide QA Stripe](docs/GUIDE_QA_STRIPE_PAS_A_PAS.md). Les procédures de passage en production se trouvent dans [la checklist paiements](docs/PAYMENT_GO_LIVE_CHECKLIST.md) et [le guide wallet](docs/blockchain/README.md).

## Tests E2E

La suite Playwright couvre les parcours principaux de chaque rôle :

- Visiteur : accès à la page d'accueil et consultation d'une œuvre publique ;
- Collector : connexion, ajout au panier et passage au checkout ;
- Artiste : connexion et accès au dashboard artiste ;
- Admin : connexion et accès au dashboard admin.

Après un pull, exécuter depuis la racine du projet :

```bash
npm install --workspaces=false
npm run e2e:install
npm run e2e
```

## Sécurité et documentation API

- Sécurité renforcée : la plateforme applique une Content Security Policy (CSP), HSTS en production et des en-têtes de sécurité complémentaires.
- Swagger / documentation API : l'interface Swagger UI est disponible sur `/api/docs` et le document OpenAPI 3.1 sur `/api/docs/openapi.json`.

## Qualité et état de validation

Au 29 juillet 2026, la validation complète réalisée sur la branche de travail comprenait :

- 375 tests backend réussis sur 375 dans un environnement Linux isolé ;
- 84 tests frontend réussis sur 84 ;
- 43 migrations Prisma appliquées sur une base neuve ;
- lint, formatage et typecheck réussis ;
- construction sans cache des images Docker backend et frontend de production, suivie d’un démarrage avec tous les healthchecks au vert ;
- audit backend sans vulnérabilité connue ;
- audit frontend conforme au seuil CI de sévérité haute, avec quatre vulnérabilités modérées transitives connues dans la chaîne Coinbase CDP.

Ces résultats décrivent une exécution donnée. La source de vérité reste le résultat du workflow CI/CD associé au commit déployé.

## CI/CD et production

Les workflows GitHub Actions vérifient le frontend, le backend, la configuration, les migrations et les images de production. Le déploiement est déclenché après validation et fusion selon les règles du dépôt. La production utilise le domaine `https://www.makeitart.io`, Caddy comme reverse proxy et des secrets fournis par l’environnement du serveur.

Avant une mise en production :

1. vérifier les résultats CI du commit ciblé ;
2. sauvegarder PostgreSQL et contrôler les migrations ;
3. valider les variables Stripe, Coinbase CDP, OAuth, SMTP, JWT et stockage ;
4. exécuter les smoke tests d’authentification, paiement, téléchargement et wallet ;
5. contrôler les journaux, la santé des conteneurs et les webhooks.

## Conformité au sujet

Le socle demandé dans [`tmp_sujet_web.txt`](tmp_sujet_web.txt) est couvert par Nuxt, Tailwind, Node.js, PostgreSQL, OAuth 2.0, Docker, CI/CD, tests, accessibilité, consentement RGPD et analytics. Les points qui nécessitent encore une preuve ou une finalisation avant soutenance sont suivis dans [`REQUIREMENTS_DOCUMENT.md`](REQUIREMENTS_DOCUMENT.md), notamment :

- confirmer ou implémenter un véritable second facteur TOTP si cette modalité exacte reste obligatoire ;
- joindre les preuves de durcissement, sauvegarde et restauration du VPS ;
- réaliser les dernières validations Stripe et Coinbase CDP dans l’environnement réel.

## Documentation

Le point d’entrée documentaire est [`docs/README.md`](docs/README.md). Les documents structurants sont :

- [`REQUIREMENTS_DOCUMENT.md`](REQUIREMENTS_DOCUMENT.md) : exigences et état de conformité ;
- [`ROADMAP_TRELLO.md`](ROADMAP_TRELLO.md) : roadmap exploitable dans Trello ;
- [`docs/GIT_HISTORY.txt`](docs/GIT_HISTORY.txt) : historique complet des commits Git exporté depuis le dépôt ;
- [`docs/DECISIONS.md`](docs/DECISIONS.md) : décisions d’architecture ;
- [`docs/blockchain/README.md`](docs/blockchain/README.md) : architecture et exploitation du wallet ;
- [`docs/GUIDE_QA_STRIPE_PAS_A_PAS.md`](docs/GUIDE_QA_STRIPE_PAS_A_PAS.md) : validation des paiements.

## Contribution

Lire [`CONTRIBUTING.md`](CONTRIBUTING.md) avant toute modification. Les changements doivent rester ciblés, être accompagnés des tests adaptés et ne jamais introduire de secret dans Git.

## Licence

Le statut de licence du code doit être confirmé par les responsables du projet avant toute redistribution publique.
