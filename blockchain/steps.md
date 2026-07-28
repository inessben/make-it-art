# Implémentation du wallet embarqué sur Base

## Livraison

La fonctionnalité est livrée en production en trois jours.

Elle permet à un utilisateur vérifié de créer volontairement un portefeuille
numérique non custodial. Un échec de création ne bloque jamais son compte.

Le MVP comprend :

- consentement après vérification de l’e-mail ;
- création d’un wallet sur Base ;
- stockage de l’adresse publique ;
- statut et relance ;
- affichage dans le profil ;
- export sécurisé ;
- compatibilité avec les comptes et parcours existants.

Le MVP ne comprend pas :

- wallet externe ;
- NFT ;
- paiement crypto ;
- transfert d’actifs ;
- suppression ou anonymisation du compte utilisateur ;
- modification du fonctionnement des œuvres et achats.

## Fournisseur

Le fournisseur utilisé est **Coinbase Developer Platform (CDP)** avec les
**User Wallets EVM**.

Configuration :

- test : Base Sepolia ;
- production : Base Mainnet ;
- type de compte : EVM EOA exportable ;
- contrôle : utilisateur final ;
- SDK : `@coinbase/cdp-core` côté navigateur ;
- authentification CDP : JWT personnalisé ;
- identifiant CDP stable : `User.id`.

Le mode CDP « API key wallet » n’est pas utilisé. Il donnerait au serveur le
contrôle du wallet.

## Coût

Tarification CDP vérifiée le 26 juillet 2026 :

- abonnement minimum : 0 USD ;
- 5 000 opérations wallet gratuites par mois ;
- dépassement : 0,005 USD par opération ;
- création d’un compte EVM : 1 opération ;
- signature : 1 opération ;
- transaction envoyée : 2 opérations ;
- lecture : gratuite.

Le MVP effectue principalement une opération lors de la création. Le coût CDP
reste donc à 0 USD jusqu’à 5 000 créations mensuelles.

Les transactions, le gas sponsorisé, l’on-ramp et les paiements sont exclus.

## Architecture

### Frontend

Le navigateur :

1. récupère un JWT CDP court auprès du backend ;
2. s’authentifie auprès de CDP ;
3. crée le compte EVM EOA ;
4. reçoit l’adresse publique ;
5. envoie l’adresse et la preuve CDP au backend ;
6. affiche le statut et les options d’export.

La clé privée apparaît uniquement dans l’iframe sécurisée Coinbase pendant
l’export. Elle ne traverse jamais Vue, Pinia, l’API ou les logs.

### Backend

Le backend :

1. vérifie la session Make It Art ;
2. vérifie `User.verified` ;
3. enregistre le consentement ;
4. crée une demande idempotente ;
5. émet un JWT CDP de cinq minutes ;
6. vérifie la preuve CDP avant d’associer l’adresse ;
7. stocke uniquement les données publiques ;
8. gère les statuts et les relances ;
9. conserve l’association wallet tant qu’aucun parcours de suppression de compte n’existe.

### Authentification CDP

Le JWT utilise RS256 et contient :

- `iss` : URL publique du backend ;
- `sub` : `User.id` ;
- `aud` : identifiant du projet CDP ;
- `iat` ;
- `exp` : cinq minutes maximum ;
- `jti` : identifiant unique.

Le backend expose :

- `GET /.well-known/jwks.json` ;
- `POST /auth/cdp-token`.

La clé privée RS256 reste dans les secrets backend. La clé publique est publiée
par JWKS. Le claim `sub` utilise l’identifiant interne immuable, jamais l’e-mail.

## Modèle de données

Une table `Wallet` est reliée à `User`.

Champs :

- `id` ;
- `userId` ;
- `address`, nullable pendant la création ;
- `providerWalletId`, nullable ;
- `provider = COINBASE_CDP` ;
- `network = BASE` ;
- `origin = EMBEDDED | EXTERNAL` ;
- `status` ;
- `idempotencyKey` ;
- `consentedAt` ;
- `createdAt` ;
- `updatedAt` ;
- `detachedAt`, nullable ;
- `lastErrorCode`, nullable.

Statuts :

- `PENDING` ;
- `ACTIVE` ;
- `FAILED` ;
- `RETRY_REQUIRED` ;
- `DETACHED`.

Contraintes :

- `idempotencyKey` unique ;
- adresse unique par réseau ;
- index sur `userId` et `status` ;
- relation wallet facultative ;
- aucune colonne contenant un secret cryptographique.

## API

Routes ajoutées :

- `GET /wallets/me` : liste des wallets du compte ;
- `POST /wallets/consent` : consentement et demande de création ;
- `POST /wallets/:id/complete` : association après vérification CDP ;
- `POST /wallets/:id/retry` : relance ;
- `GET /wallets/:id/recovery` : ouverture du parcours d’export ;
- `POST /auth/cdp-token` : JWT court pour CDP ;
- `GET /.well-known/jwks.json` : clé publique JWT.

Toutes les routes privées :

- exigent une session valide ;
- vérifient la propriété du wallet ;
- valident les données ;
- limitent les relances ;
- ne retournent que des informations publiques.

## Variables d’environnement

### Backend

```text
CDP_PROJECT_ID=
CDP_JWT_ISSUER=
CDP_JWT_AUDIENCE=
CDP_JWT_PRIVATE_KEY=
CDP_JWT_KEY_ID=
CDP_REQUEST_TIMEOUT_MS=5000
WALLET_FEATURE_ENABLED=false
```

### Frontend

```text
NUXT_PUBLIC_CDP_PROJECT_ID=
NUXT_PUBLIC_WALLET_NETWORK=base
NUXT_PUBLIC_BASE_EXPLORER_URL=https://basescan.org
```

Les projets et secrets de test et production sont séparés. Aucun secret
n’apparaît dans Git ou dans le bundle frontend.

---

# Jour 1 — Backend et Coinbase CDP

## Étape 1 — Cartographier l’existant

Lire et tracer :

- `backend/src/routes/auth.routes.js` ;
- `backend/src/services/auth.service.js` ;
- `backend/src/repositories/user.repository.js` ;
- `backend/prisma/schema.prisma` ;
- `backend/src/utils/serialize-auth-user.js` ;
- `frontend/pages/verify-email.vue` ;
- `frontend/components/account/AccountSettingsForms.vue` ;
- `frontend/pages/wallet.vue` ;

Le point d’entrée du consentement est placé après la réussite de
`GET /auth/verify-email`.

## Étape 2 — Configurer CDP

1. Créer le compte Coinbase Developer Platform.
2. Créer un projet de test.
3. Créer un projet de production.
4. Activer les User Wallets EVM.
5. Désactiver la création automatique à la connexion.
6. Configurer Base Sepolia dans le projet de test.
7. Configurer Base Mainnet dans le projet de production.
8. Enregistrer les domaines autorisés.
9. Configurer l’authentification JWT personnalisée.
10. Configurer l’URL JWKS du backend.
11. Configurer `sub` comme identifiant utilisateur.
12. Créer une alerte avant 5 000 opérations mensuelles.

## Étape 3 — Ajouter Prisma

Modifier `backend/prisma/schema.prisma` :

- ajouter `Wallet` ;
- ajouter les enums réseau, origine, fournisseur et statut ;
- ajouter la relation `User.wallets` ;
- ajouter les contraintes et index.

Créer et tester la migration.

## Étape 4 — Ajouter le backend wallet

Créer :

- `backend/src/repositories/wallet.repository.js` ;
- `backend/src/services/wallet.service.js` ;
- `backend/src/routes/wallet.routes.js` ;
- `backend/src/services/cdp-auth.service.js`.

Le service :

1. refuse les utilisateurs non authentifiés ;
2. refuse les e-mails non vérifiés ;
3. exige le consentement ;
4. crée ou retrouve la demande par clé d’idempotence ;
5. empêche une seconde création active ;
6. émet le JWT CDP ;
7. vérifie le résultat CDP ;
8. enregistre l’adresse ;
9. conserve le compte utilisable en cas d’échec ;
10. autorise une relance contrôlée.

## Étape 5 — Tests du jour 1

- utilisateur non vérifié refusé ;
- utilisateur sans consentement refusé ;
- JWT CDP valide ;
- JWT expiré refusé ;
- création réussie ;
- timeout ;
- fournisseur indisponible ;
- double demande ;
- relance après échec ;
- adresse déjà associée ;
- absence de secret dans les réponses et logs.

## Validation du jour 1

- projets CDP test et production créés ;
- migration fonctionnelle ;
- endpoints backend testés ;
- création idempotente ;
- inscription existante inchangée.

---

# Jour 2 — Frontend et profil

## Étape 1 — Installer CDP

Ajouter `@coinbase/cdp-core` au frontend.

Créer :

- `frontend/plugins/coinbase-cdp.client.js` ;
- `frontend/composables/useEmbeddedWallet.js` ;
- `frontend/components/account/EmbeddedWalletPanel.vue`.

Le SDK n’est initialisé que côté client.

## Étape 2 — Ajouter le consentement

Après vérification de l’e-mail, afficher :

> Créer mon portefeuille numérique

Le texte précise :

- le portefeuille est facultatif ;
- il servira aux futures acquisitions numériques ;
- l’utilisateur conserve le contrôle ;
- un wallet externe pourra être connecté plus tard.

Le refus laisse le compte entièrement utilisable.

## Étape 3 — Créer le wallet

1. Enregistrer le consentement.
2. Créer la demande `PENDING`.
3. Récupérer le JWT CDP.
4. Appeler `authenticateWithJWT`.
5. Créer l’EOA EVM.
6. Envoyer l’adresse et la preuve au backend.
7. Afficher `ACTIVE`.
8. En cas d’erreur, afficher `RETRY_REQUIRED`.
9. Permettre la relance.

Un timeout ne déconnecte pas l’utilisateur et ne bloque pas le profil.

## Étape 4 — Afficher le profil

La page `frontend/pages/wallet.vue` affiche :

- adresse abrégée ;
- bouton de copie ;
- `Portefeuille intégré` ;
- statut ;
- réseau Base ;
- lien BaseScan ;
- bouton de relance ;
- bouton d’export sécurisé CDP.

États affichés :

- aucun consentement ;
- création en cours ;
- actif ;
- échec ;
- relance requise ;
- dissocié.

## Étape 5 — Tests du jour 2

- consentement accepté ;
- consentement refusé ;
- aucune création avant vérification ;
- tous les statuts du profil ;
- copie d’adresse ;
- export ouvert dans l’iframe CDP ;
- accès au wallet d’un autre compte refusé ;
- relances trop fréquentes refusées ;
- panne CDP pendant le parcours.

## Validation du jour 2

- parcours complet sur Base Sepolia ;
- export fonctionnel ;
- relance fonctionnelle ;
- aucune modification du fonctionnement des œuvres et achats.

---

# Jour 3 — Production

## Étape 1 — Contrôles

Exécuter :

- tests backend ;
- tests frontend ;
- lint ;
- formatage ;
- typecheck ;
- build backend ;
- build frontend ;
- migration sur base vide ;
- migration sur copie de préproduction.

Tester manuellement :

- double clic ;
- rafraîchissement pendant la création ;
- fermeture du navigateur ;
- timeout ;
- panne CDP ;
- relance ;
- export ;
- absence de secrets dans le navigateur, l’API et les logs.

## Étape 2 — Non-régressions

Valider :

- inscription sans wallet ;
- vérification e-mail ;
- connexion classique et Google ;
- comptes existants ;
- publication d’œuvres ;
- panier ;
- achats ;
- absence du SDK serveur dans le frontend ;
- absence de secrets CDP dans le bundle.

## Étape 3 — Déploiement

1. Sauvegarder la base.
2. Configurer les secrets de production.
3. Configurer Base Mainnet.
4. Configurer les domaines de production.
5. Laisser `WALLET_FEATURE_ENABLED=false`.
6. Appliquer la migration.
7. Déployer le backend.
8. Déployer le frontend.
9. Exécuter les tests de santé.
10. Activer le feature flag.
11. Créer un wallet de contrôle.
12. Vérifier BaseScan et l’export.

## Étape 4 — Surveillance

Mesurer :

- consentements ;
- créations ;
- réussites ;
- échecs ;
- timeouts ;
- relances ;
- doublons bloqués ;
- opérations CDP facturées.

Aucun token, secret ou matériel cryptographique n’est journalisé.

## Étape 5 — Retour arrière

En cas d’incident :

1. désactiver `WALLET_FEATURE_ENABLED` ;
2. arrêter les nouvelles créations ;
3. conserver les wallets déjà associés ;
4. restaurer la version applicative précédente ;
5. ne supprimer aucune donnée on-chain ;
6. laisser tous les comptes fonctionner sans wallet.

## Validation finale

- production active sur Base ;
- consentement explicite ;
- utilisateur vérifié obligatoire ;
- création idempotente ;
- échec non bloquant ;
- aucun secret stocké ou exposé ;
- export disponible ;
- profil complet ;
- aucune régression ;
- contrôles automatisés réussis ;
- désactivation immédiate disponible.

---

# Fichiers concernés

## Backend modifiés

- `backend/prisma/schema.prisma` ;
- `backend/src/routes/auth.routes.js` ;
- `backend/src/services/auth.service.js` ;
- `backend/src/repositories/user.repository.js` ;
- `backend/src/utils/serialize-auth-user.js` ;
- configuration d’environnement ;
- assemblage des routes.

## Backend ajoutés

- migration Prisma wallet ;
- `backend/src/repositories/wallet.repository.js` ;
- `backend/src/services/wallet.service.js` ;
- `backend/src/routes/wallet.routes.js` ;
- `backend/src/services/cdp-auth.service.js` ;
- tests wallet et CDP.

## Frontend modifiés

- `frontend/pages/verify-email.vue` ;
- `frontend/components/account/AccountSettingsForms.vue` ;
- `frontend/components/account/AccountSettingsSidebar.vue` ;
- `frontend/pages/wallet.vue` ;
- `frontend/stores/auth.js` ;
- `frontend/package.json`.

## Frontend ajoutés

- `frontend/plugins/coinbase-cdp.client.js` ;
- `frontend/composables/useEmbeddedWallet.js` ;
- `frontend/components/account/EmbeddedWalletPanel.vue` ;
- tests du parcours wallet.

---

# Phase suivante

La connexion d’un wallet externe est réalisée après le MVP.

Le modèle du MVP accepte déjà plusieurs wallets et l’origine `EXTERNAL`.

La phase suivante ajoute :

- challenge serveur ;
- nonce unique ;
- expiration courte ;
- signature utilisateur ;
- vérification serveur ;
- protection contre le rejeu ;
- association au compte ;

## Ordre des commits

1. `docs: document Coinbase CDP wallet architecture`
2. `feat: add wallet data model`
3. `feat: add CDP custom authentication`
4. `feat: add wallet consent and creation`
5. `feat: expose wallet endpoints`
6. `feat: display embedded wallet`
8. `test: cover embedded wallet lifecycle`
9. `docs: add CDP production setup`
