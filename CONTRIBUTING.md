# Contribuer à Make It Art

## Principes

Une contribution doit être ciblée, testée, accessible, documentée et dépourvue de secret. Les modifications existantes d’un autre contributeur ne doivent jamais être écrasées pour simplifier une fusion.

## Prérequis

- Git ;
- Docker Desktop et Docker Compose ;
- Node.js 22 si les commandes sont exécutées hors conteneur ;
- un fichier `infrastructure/.env` local créé depuis l’exemple fourni.

Ne versionnez jamais les fichiers `.env`, clés Stripe ou Coinbase, secrets OAuth, clés JWT, identifiants SMTP ou données réelles d’utilisateurs.

## Installation

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

## Branches

Utiliser une branche dédiée et courte :

```text
feature/<sujet>
fix/<sujet>
docs/<sujet>
chore/<sujet>
```

Avant une fusion :

1. récupérer la branche cible ;
2. résoudre les conflits en conservant les deux intentions métier ;
3. relancer les contrôles requis ;
4. examiner le diff complet ;
5. vérifier qu’aucun secret ni fichier généré n’est inclus.

## Commits

Un commit doit représenter une unité cohérente. Utiliser un message descriptif, par exemple :

```text
feature: add artist withdrawal review
fix: preserve wallet retry idempotency
docs: refresh deployment checklist
```

Éviter de mélanger refactorisation, fonctionnalité et formatage global dans un même commit.

## Commandes de développement

```bash
npm run dev:up
npm run dev:up:build
npm run dev:logs
npm run dev:down
```

Services usuels :

- application : <http://localhost> ;
- frontend : <http://localhost:3000> ;
- API : <http://localhost:4000/api> ;
- OpenAPI : <http://localhost:4000/api/docs> ;
- Mailpit : <http://localhost:8025>.

## Contrôles avant revue

Exécuter les contrôles proportionnés au changement, puis la suite complète avant fusion :

```bash
npm run lint
npm run format:check
npm test
npm run security:audit
npm run prod:build
```

Lorsque disponible pour la branche :

```bash
npm run quality
npm run ci
npm run test:coverage
npm run qa:artwork-licences
```

Les tests qui nécessitent PostgreSQL, Redis, Stripe ou Coinbase doivent être exécutés dans un environnement isolé, jamais avec des identifiants live dans une CI de contribution.

## Règles backend

- valider chaque entrée à la frontière HTTP ;
- appliquer authentification, rôle et propriété sur toute route protégée ;
- garder les opérations financières et wallet idempotentes ;
- utiliser Prisma et une migration pour toute évolution persistante ;
- préserver les contraintes et journaux d’audit ;
- ne jamais journaliser de jeton, secret, donnée bancaire ou clé privée ;
- documenter les nouvelles routes dans OpenAPI ;
- ajouter des tests d’erreur, de concurrence et d’autorisation.

## Règles frontend

- réutiliser les composants et tokens Tailwind existants ;
- éviter les styles en dur lorsque la configuration ou une classe utilitaire convient ;
- préserver le rendu serveur et isoler les SDK strictement clients ;
- afficher les états chargement, vide, succès, erreur et relance ;
- ne jamais exposer une variable serveur via `NUXT_PUBLIC_*` ;
- ajouter ou adapter les tests des comportements modifiés.

## Accessibilité

Chaque écran modifié doit respecter au minimum :

- navigation complète au clavier ;
- focus visible et ordre logique ;
- label explicite pour chaque champ ;
- nom accessible pour chaque bouton et lien ;
- texte alternatif adapté pour les images ;
- hiérarchie de titres sans saut artificiel ;
- contraste WCAG AA ;
- annonces des erreurs et changements importants ;
- ARIA uniquement lorsque le HTML natif ne suffit pas.

## Données, migrations et production

Pour une migration :

1. modifier le schéma Prisma ;
2. générer une migration nommée ;
3. tester l’application sur une base neuve ;
4. tester la montée de version sur des données représentatives ;
5. documenter le rollback ou la restauration ;
6. ne jamais réécrire une migration déjà déployée.

Toute modification de production doit prévoir santé, journaux, sauvegarde, reprise et vérification après déploiement.

## Paiements et wallet

Les changements Stripe suivent [`docs/PAYMENT_SECURITY_OPERATIONS.md`](docs/PAYMENT_SECURITY_OPERATIONS.md) et [`docs/GUIDE_QA_STRIPE_PAS_A_PAS.md`](docs/GUIDE_QA_STRIPE_PAS_A_PAS.md).

Les changements Coinbase CDP suivent [`docs/blockchain/README.md`](docs/blockchain/README.md). Une clé privée utilisateur ne doit jamais être reçue, stockée ou journalisée par Make It Art.

## Documentation

Mettre à jour le document canonique correspondant au changement :

- périmètre et démarrage : `README.md` ;
- exigence : `REQUIREMENTS_DOCUMENT.md` ;
- priorité ou jalon : `ROADMAP_TRELLO.md` ;
- décision structurante : `docs/DECISIONS.md` ;
- procédure QA/opérationnelle : document spécialisé sous `docs/` ;
- historique des contributions : `docs/GIT_HISTORY.txt`.

Ne créez pas un nouveau document si une section existante peut devenir la source de vérité.

## Pull request

La description doit préciser :

- problème et résultat attendu ;
- fichiers et migrations concernés ;
- risques et stratégie de retour arrière ;
- tests réellement exécutés et résultats ;
- captures pour les changements visuels ;
- impacts accessibilité, sécurité et données ;
- documentation mise à jour.