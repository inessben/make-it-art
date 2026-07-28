# Jour 1 — Backend et Coinbase CDP

## Résultat

Le socle backend des wallets intégrés est terminé. Aucun wallet n’est créé automatiquement : seuls les utilisateurs authentifiés, actifs, dont l’adresse e-mail est vérifiée et qui donnent un consentement explicite pourront démarrer la création.

Le compte Make It Art reste utilisable lorsque le wallet est refusé, indisponible ou en échec.

## 1. Analyse de l’existant

L’application utilise :

- Express/CommonJS et Prisma/PostgreSQL dans le backend ;
- Nuxt 3, Vue et Pinia dans le frontend ;
- une session JWT stockée dans des cookies et un refresh token Redis ;
- l’inscription par e-mail et Google OAuth ;
- une activation du compte après vérification de l’adresse e-mail.

Le consentement wallet doit donc être présenté après la première authentification d’un utilisateur vérifié. Aucun parcours de suppression de compte n’existe ; aucun mécanisme de suppression ou d’anonymisation du wallet n’est ajouté dans ce périmètre.

Le champ historique `User.walletAddress`, mappé sur `wallet_addresse`, a été conservé pour éviter toute régression.

Le détail de cette analyse se trouve dans `blockchain/day-1-analysis.md`.

## 2. Configuration Coinbase CDP

### Projet de test

- projet : `make-it-art-wallet-test` ;
- Project ID : `4339e361-9d14-4d70-b1a6-75ddc9dee47f` ;
- produit : Non-custodial Wallet / User wallets ;
- domaine autorisé : `http://localhost:3000` ;
- clé API secrète serveur créée pour le backend de test ;
- Wallet Secret absent ;
- delegated signing désactivé ;
- project policy absente.

### Projet de production

- projet : `make-it-art-wallet-production` ;
- domaine autorisé : `https://www.makeitart.io` ;
- aucun domaine localhost ;
- Wallet Secret absent ;
- delegated signing désactivé ;
- project policy absente.

### Compte custodial sandbox inutilisé

Un CDP Account custodial sandbox nommé `make-it-art-wallet-test` a été créé pendant l’exploration du portail. Il n’est pas utilisé par l’intégration, ne contient aucun fonds et peut rester sans incidence.

### Sécurité des secrets

Les variables suivantes sont stockées uniquement dans le `.env` racine ignoré par Git :

- `CDP_PROJECT_ID` ;
- `CDP_API_KEY_ID` ;
- `CDP_API_KEY_SECRET` ;
- `CDP_AUTH_ISSUER` ;
- `CDP_AUTH_AUDIENCE` ;
- `CDP_AUTH_KEY_ID` ;
- `CDP_AUTH_PRIVATE_KEY` ;
- `CDP_REQUEST_TIMEOUT_MS`.

Aucune valeur secrète n’est inscrite dans ce document, le frontend, les réponses HTTP ou les logs.

La Secret API Key sert uniquement à authentifier la validation backend du jeton utilisateur auprès de Coinbase. Elle ne permet pas au backend de signer les transactions du wallet utilisateur sans Wallet Secret ou délégation, qui restent absents.

## 3. Custom Authentication

Une paire RSA 2048 bits dédiée a été générée localement :

- algorithme JWT : `RS256` ;
- issuer : `https://www.makeitart.io` ;
- audience de test : `make-it-art-wallet-test` ;
- identifiant utilisateur : claim standard `sub`, contenant l’identifiant interne stable de l’utilisateur ;
- durée du JWT utilisateur : cinq minutes ;
- identifiant de clé `kid` unique.

Le backend expose la clé publique au format JWKS sur :

```text
GET /api/.well-known/jwks.json
```

URL de production après déploiement :

```text
https://www.makeitart.io/api/.well-known/jwks.json
```

La clé privée ne figure jamais dans le JWKS. Custom Authentication restera désactivée dans Coinbase tant que cette URL publique ne contiendra pas le nouveau backend déployé.

## 4. Modèle Prisma

### Modèles ajoutés

- `Wallet` : état et adresse d’un wallet associé à un utilisateur ;
- `WalletConsent` : historique versionné des décisions de consentement.

### Enums ajoutés

- `WalletProvider` ;
- `WalletNetwork` ;
- `WalletOrigin` ;
- `WalletStatus`.

### États gérés

- `PENDING` ;
- `ACTIVE` ;
- `FAILED` ;
- `RETRY_REQUIRED` ;
- `DETACHED` ;
- `UNVERIFIED`.

### Contraintes

- clé d’idempotence unique ;
- identifiant wallet fournisseur unique par fournisseur lorsqu’il existe ;
- adresse unique par réseau ;
- index utilisateur/statut ;
- relations utilisateur avec suppression bloquée par la base ;
- aucune clé privée, seed phrase ou secret dans PostgreSQL.

### Compatibilité historique

Les éventuelles valeurs de `wallet_addresse` sont copiées pendant la migration avec les marqueurs :

- provider : `LEGACY_IMPORT` ;
- network : `UNKNOWN` ;
- origin : `LEGACY` ;
- status : `UNVERIFIED`.

Aucune adresse historique n’est présentée comme un wallet Base vérifié.

### Migration

- migration : `20260727043000_embedded_wallet_model` ;
- schéma Prisma validé ;
- client Prisma généré ;
- migration appliquée à PostgreSQL local ;
- tables `wallet` et `wallet_consent` vérifiées.

## 5. Backend wallet

### Fichiers créés

- `backend/src/repositories/wallet.repository.js` ;
- `backend/src/services/wallet.service.js` ;
- `backend/src/services/cdp-auth.service.js` ;
- `backend/src/routes/wallet.routes.js`.

### Endpoints

- `GET /api/.well-known/jwks.json` : publication de la clé publique ;
- `GET /api/wallets/me` : wallets de l’utilisateur connecté ;
- `POST /api/wallets/consent` : décision explicite de consentement ;
- `POST /api/wallets` : création ou récupération d’une demande idempotente ;
- `POST /api/wallets/:id/cdp-token` : JWT Custom Authentication court ;
- `POST /api/wallets/:id/complete` : validation Coinbase et activation ;
- `POST /api/wallets/:id/failure` : enregistrement d’un échec contrôlé ;
- `POST /api/wallets/:id/retry` : relance d’une création échouée.

### Règles appliquées

1. session Make It Art obligatoire ;
2. utilisateur actif et adresse e-mail vérifiée ;
3. consentement explicite obligatoire ;
4. idempotence contrôlée par une clé fournie par le client ;
5. un seul wallet intégré actif par utilisateur ;
6. adresse EVM au format `0x` plus 40 caractères hexadécimaux ;
7. validation serveur du jeton Coinbase ;
8. correspondance obligatoire entre le claim JWT `sub`, l’utilisateur local et l’adresse retournée ;
9. conflit d’adresse converti en réponse métier `409` ;
10. échecs et timeout sans désactivation du compte ;
11. relance autorisée seulement depuis un état récupérable ;
12. rate limiting dédié aux écritures wallet.

### Validation Coinbase

Le backend appelle :

```text
POST https://api.cdp.coinbase.com/platform/v2/end-users/auth/validate-token
```

La requête est authentifiée avec un Bearer JWT de deux minutes généré par le SDK officiel Coinbase à partir de la Secret API Key. Le jeton utilisateur reçu du frontend n’est ni stocké ni renvoyé.

Le timeout fournisseur est fixé à huit secondes.

## 6. Dépendances

Backend :

```text
@coinbase/cdp-sdk
```

Cette dépendance génère le JWT d’authentification serveur compatible avec les clés Ed25519 et ECDSA de Coinbase.

## 7. Tests et contrôles

### Tests ajoutés

- JWT RS256 correctement signé et à durée courte ;
- rejet après expiration ;
- JWKS sans clé privée ;
- identité JWT et adresse EVM concordantes ;
- utilisateur non vérifié refusé ;
- consentement obligatoire ;
- idempotence ;
- validation et persistance de l’adresse ;
- échec récupérable et relance ;
- adresse déjà associée ;
- fournisseur indisponible ;
- timeout ;
- absence de Secret API Key et de jeton utilisateur dans les résultats.

### Résultats

- lint backend : réussi ;
- suite backend : 115 tests réussis ;
- échecs : 0 ;
- contrôle cryptographique JWT/JWKS : réussi ;
- PostgreSQL local : opérationnel.

Le contrôle API réel avec un jeton volontairement invalide a retourné `401 unauthorized`, sans création de wallet ni modification de données Coinbase.

## 8. Fichiers concernés

- `backend/package.json` ;
- `backend/prisma/schema.prisma` ;
- `backend/prisma/migrations/20260727043000_embedded_wallet_model/migration.sql` ;
- `backend/src/config/env.js` ;
- `backend/src/middlewares/rate-limit.middleware.js` ;
- `backend/src/repositories/wallet.repository.js` ;
- `backend/src/routes/index.js` ;
- `backend/src/routes/wallet.routes.js` ;
- `backend/src/services/cdp-auth.service.js` ;
- `backend/src/services/wallet.service.js` ;
- `backend/test/cdp-auth.service.test.js` ;
- `backend/test/wallet.service.test.js` ;
- `package-lock.json`.

Le fichier `infrastructure/.env.production.example`, modifié indépendamment, n’a pas été utilisé pour stocker les secrets et n’a pas été écrasé.

## 9. État à la fin du jour 1

Le backend, la base de données, l’idempotence, la validation Coinbase, le mécanisme JWKS et les tests sont prêts.

Aucun wallet utilisateur réel n’a encore été créé. La création effective dépend du frontend du jour 2 et de l’activation de Custom Authentication après déploiement public du JWKS.
