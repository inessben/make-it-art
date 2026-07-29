# Historique technique de l’intégration wallet

> Ce document conserve les constats et travaux effectués pendant l’intégration. Certaines versions ou étapes décrites sont historiques. La configuration et la procédure actuelles se trouvent dans [README.md](README.md).

---

# Jour 1 — Étape 1 : analyse de l’existant

## État de l’analyse

Cette étape ne modifie pas le backend ni le frontend. Elle fixe les points
d’intégration du wallet Coinbase CDP dans l’architecture existante.

## Stack constatée

- Backend : Node.js 22, Express 4, CommonJS.
- Base : PostgreSQL 16 avec Prisma 7.
- Sessions : JWT de 15 minutes en cookie HTTP-only et refresh token Redis.
- Authentification : e-mail/mot de passe, code de connexion et Google OAuth.
- Frontend : Nuxt 3, Vue 3 et Pinia.
- Déploiement : Docker Compose, Caddy en production.
- Tests : `node:test` avec chargement de modules mockés.
- CI : lint et formatage uniquement pour le backend et le frontend.

## Inscription classique

### Parcours actuel

1. `frontend/pages/register.vue` envoie `POST /api/auth/register`.
2. `backend/src/routes/auth.routes.js` valide les champs et le mot de passe.
3. `backend/src/services/auth.service.js` normalise l’e-mail et crée
   l’utilisateur.
4. L’utilisateur est créé avec :
   - `verified = false` ;
   - `isActive = false`.
5. Un token de vérification haché est enregistré.
6. Un lien vers `/verify-email?token=...` est envoyé.
7. Aucun cookie de session n’est créé pendant l’inscription.

### Conséquence pour le wallet

La création du wallet ne sera pas ajoutée à `registerUser`. À cet instant :

- l’utilisateur n’a pas encore confirmé son e-mail ;
- il n’a pas donné son consentement ;
- il n’a pas de session authentifiée.

L’inscription reste donc strictement inchangée.

## Vérification de l’e-mail

### Parcours actuel

1. `frontend/pages/verify-email.vue` appelle
   `GET /api/auth/verify-email?token=...`.
2. `backend/src/services/auth.service.js` vérifie le token.
3. `backend/src/repositories/user.repository.js` passe :
   - `verified = true` ;
   - `isActive = true`.
4. La page propose ensuite de revenir à la connexion.
5. Aucune session n’est ouverte automatiquement.

### Point d’intégration retenu

La page de vérification ne crée pas directement le wallet et ne demande pas le
consentement final, car elle ne possède pas de session authentifiée.

Elle affiche seulement qu’un portefeuille pourra être créé après connexion.

Le consentement est présenté après la première connexion réussie d’un
utilisateur vérifié.

## Connexion et sessions

### Parcours actuel

- La connexion e-mail exige un utilisateur vérifié et actif.
- Un code de connexion complète l’authentification.
- L’accès est stocké dans un cookie HTTP-only de 15 minutes.
- Le refresh token est stocké dans Redis pendant sept jours.
- `authRequired` recharge l’utilisateur depuis la base à chaque requête.
- `GET /auth/me` alimente le store Pinia.

### Point d’intégration retenu

La réponse sérialisée de `GET /auth/me` contiendra un résumé public :

- `walletConsentRequired` ;
- `walletStatus` ;
- `hasEmbeddedWallet`.

Le frontend utilise ces valeurs après connexion pour afficher le consentement
sans modifier la logique de session existante.

Le JWT CDP est distinct du JWT de session :

- session Make It Art : secret HMAC actuel, cookie HTTP-only ;
- CDP : JWT RS256 de cinq minutes, émis uniquement sur demande ;
- aucune modification du format du cookie de session existant.

## Google OAuth

### Parcours actuel

Un nouveau compte Google est créé directement avec :

- `verified = true` ;
- `isActive = true` ;
- aucune vérification e-mail Make It Art supplémentaire.

Un compte e-mail existant peut être lié à Google après confirmation du mot de
passe.

### Point d’intégration retenu

Les nouveaux utilisateurs Google suivent le même consentement après leur
première connexion authentifiée.

La logique ne dépend pas du passage par `/verify-email`. Elle dépend uniquement
de :

- `User.verified = true` ;
- `User.isActive = true` ;
- absence de décision de consentement ;
- absence de wallet embarqué actif.

Cette règle couvre les comptes classiques et Google sans duplication.

## Modèle utilisateur

### État actuel

`backend/prisma/schema.prisma` contient déjà :

```prisma
walletAddress String? @map("wallet_addresse")
```

La colonne physique est mal orthographiée : `wallet_addresse`.

Ce champ :

- ne permet qu’une adresse ;
- ne contient ni réseau, ni fournisseur, ni statut ;
- n’est utilisé par aucun service ou composant identifié ;
- ne convient pas au modèle multi-wallet.

Le schéma contient aussi `ConsentRGPD`, mais aucun repository ou service
d’utilisation n’a été trouvé pour ce modèle.

### Migration retenue

Une nouvelle table `Wallet` devient la source de vérité.

Le champ historique n’est pas supprimé dans la première migration.

La migration :

1. crée la table et les enums wallet ;
2. copie toute valeur non nulle de `wallet_addresse` dans un wallet historique ;
3. marque son origine de manière explicite ;
4. conserve temporairement la colonne existante ;
5. vérifie les doublons avant d’ajouter l’unicité réseau/adresse.

La suppression de `walletAddress` sera réalisée dans une migration ultérieure
après validation des données de production.

### Consentement

Le consentement wallet est stocké séparément avec :

- décision acceptée ou refusée ;
- version du texte ;
- date ;
- utilisateur ;
- date de révocation éventuelle.

Une décision refusée empêche la réapparition immédiate du dialogue. Une action
reste disponible dans la page wallet pour changer ce choix.

## Profil utilisateur

### État actuel

- `/account-settings` affiche `AccountSettingsForms`.
- `AccountSettingsSidebar` contient la navigation du compte.
- `/wallet` existe déjà mais affiche uniquement un panneau indisponible.
- `/wallet` est protégé par le middleware `auth`.
- aucun lien `/wallet` n’est présent dans la navigation du compte.

### Point d’intégration retenu

- `frontend/pages/wallet.vue` est réutilisé.
- Un lien `Wallet` est ajouté à `AccountSettingsSidebar`.
- La logique CDP est isolée dans un composable client.
- La page affiche les données locales chargées depuis l’API.
- Le SDK CDP n’est chargé que dans le navigateur.
- L’export utilise exclusivement l’interface isolée de Coinbase.

`AccountSettingsForms.vue` n’est pas utilisé pour porter toute la logique
wallet. Cela évite d’agrandir un composant déjà volumineux.

## Suppression du compte

Aucun parcours de suppression de compte n’existe actuellement. La création de ce parcours est exclue du MVP wallet.

Conséquences :

- aucune route de suppression ou d’anonymisation n’est ajoutée ;
- aucune logique wallet n’est branchée sur la suppression ;
- le wallet reste associé au compte ;
- les relations Prisma existantes ne sont pas modifiées pour ce besoin ;
- la suppression/dissociation sera traitée dans une fonctionnalité ultérieure.

## Configuration et production

### État actuel

- Les variables backend sont centralisées dans
  `backend/src/config/env.js`.
- Le développement utilise `infrastructure/.env`.
- La production utilise `infrastructure/.env.production`.
- Les variables sont injectées par Docker Compose.
- Le frontend reçoit seulement les variables publiques Nuxt.
- Caddy expose le frontend et le proxy API.

### Changements nécessaires

Backend :

- configuration CDP/JWT RS256 ;
- clé privée JWT ;
- identifiant de clé ;
- issuer et audience ;
- feature flag ;
- timeout ;
- URL publique JWKS.

Frontend :

- project ID CDP public ;
- réseau Base ;
- URL BaseScan ;
- feature flag public dérivé de la configuration serveur.

Les fichiers Docker Compose développement et production devront transmettre
ces variables. Les clés privées restent exclusivement dans le conteneur
backend.

## Tests et CI

### État actuel

La CI exécute :

- lint frontend ;
- formatage frontend ;
- lint backend ;
- formatage backend ;
- validation de la syntaxe Docker Compose.

Elle n’exécute pas :

- tests ;
- typecheck ;
- builds ;
- validation Prisma ;
- migrations.

### Changements nécessaires

Avant le déploiement wallet, la CI devra exécuter :

- tests backend ;
- tests frontend ;
- `nuxt typecheck` ;
- build frontend ;
- validation Prisma ;
- test de migration sur PostgreSQL ;
- contrôle de présence accidentelle de secrets.

Les tests CDP utilisent un adaptateur simulé. La CI ne crée aucun wallet réel et
n’a pas besoin d’un secret CDP de production.

## Fichiers existants modifiés pendant l’implémentation

### Backend

- `backend/prisma/schema.prisma`
- `backend/src/config/env.js`
- `backend/src/routes/index.js`
- `backend/src/routes/auth.routes.js`
- `backend/src/repositories/user.repository.js`
- `backend/src/utils/serialize-auth-user.js`
- `backend/test/auth.routes.account.test.js`
- `infrastructure/docker-compose.yml`
- `infrastructure/docker-compose.prod.yml`
- `infrastructure/.env.example`
- `.github/workflows/ci.yml`

`backend/src/services/auth.service.js` ne déclenche pas la création du wallet.
Il ne sera modifié que si le message de vérification doit contenir une
information supplémentaire.

### Frontend

- `frontend/nuxt.config.ts`
- `frontend/package.json`
- `frontend/pages/verify-email.vue`
- `frontend/pages/wallet.vue`
- `frontend/components/account/AccountSettingsSidebar.vue`
- `frontend/stores/auth.js`

## Fichiers ajoutés pendant l’implémentation

### Backend

- migration Prisma wallet ;
- `backend/src/repositories/wallet.repository.js`
- `backend/src/services/wallet.service.js`
- `backend/src/services/cdp-auth.service.js`
- `backend/src/routes/wallet.routes.js`
- tests repository, service et routes.

### Frontend

- `frontend/plugins/coinbase-cdp.client.js`
- `frontend/composables/useEmbeddedWallet.js`
- `frontend/components/account/EmbeddedWalletPanel.vue`
- composants de confirmation de fermeture du compte ;
- tests du parcours wallet.

## Risques identifiés

### Risques critiques

1. Utiliser le mode CDP contrôlé par API key rendrait le serveur capable de
   signer. Ce mode est interdit.
2. Accepter une adresse déclarée sans preuve CDP permettrait l’usurpation.
3. Utiliser l’e-mail comme identifiant CDP créerait un nouveau wallet après un
   changement d’adresse.
4. Exposer la clé RS256 ou un secret CDP dans Nuxt compromettrait tous les
   wallets.

### Risques de régression

1. Ajouter la création à `registerUser` bloquerait l’inscription.
2. Modifier le JWT de session actuel pourrait casser login, refresh et 2FA.
3. Réutiliser `walletAddress` empêcherait le multi-wallet.
4. Afficher le consentement uniquement après `/verify-email` oublierait Google
   OAuth.
5. Modifier globalement `AccountSettingsForms` augmenterait le risque UI.
6. Une migration d’unicité peut échouer si des adresses historiques sont
   dupliquées.

### Contrôles imposés

- feature flag désactivé par défaut ;
- migration additive ;
- conservation temporaire du champ historique ;
- adaptateur CDP simulé dans les tests ;
- aucune dépendance wallet dans les achats et œuvres ;
- endpoints idempotents ;
- rate limit sur création et relance ;
- logs sans adresse e-mail, token ou matériel privé ;
- activation progressive en production.

## Point de branchement final

Le parcours retenu est :

1. compte créé normalement ;
2. e-mail vérifié ou compte Google vérifié ;
3. première session authentifiée ;
4. `GET /auth/me` indique qu’une décision wallet est requise ;
5. l’utilisateur accepte ou refuse ;
6. en cas d’acceptation, une demande `PENDING` est créée ;
7. le navigateur s’authentifie auprès de CDP ;
8. CDP crée l’EOA ;
9. le backend vérifie puis associe l’adresse ;
10. le profil affiche `ACTIVE` ou une relance.

Ce branchement ne modifie pas les invariants actuels de l’inscription, de la
vérification e-mail, de Google OAuth, de la 2FA ou des sessions.

## Conclusion de l’étape 1

L’intégration est compatible avec l’architecture existante si elle reste
additive.

Les deux écarts majeurs par rapport au plan initial sont :

- le consentement intervient après la première connexion vérifiée ;
- la suppression de compte reste hors périmètre tant que cette fonctionnalité n’existe pas dans le produit.

Aucune implémentation wallet ne doit commencer avant validation de cette
cartographie et de ces deux décisions.

# Jour 2 — Frontend et profil wallet

## Statut

Le Jour 2 est validé.

Le parcours complet a été exécuté avec un wallet Base actif. L’utilisateur peut donner ou refuser son consentement, créer le wallet, consulter son adresse publique, ouvrir BaseScan et préparer l’export sécurisé. Un échec CDP reste non bloquant et peut être relancé.

## Étape 1 — Intégration du SDK CDP

Les éléments frontend suivants ont été ajoutés :

- `frontend/plugins/coinbase-cdp.client.js` : chargement du SDK Coinbase CDP uniquement dans le navigateur ;
- `frontend/composables/useEmbeddedWallet.js` : orchestration de l’authentification CDP, de la création, de la reprise, de la relance et de l’export ;
- `frontend/utils/embedded-wallet-creation.js` : fonctions testables pour les identifiants idempotents, les timeouts, les statuts, la copie d’adresse, BaseScan et l’export ;
- `frontend/components/account/WalletConsentPanel.vue` : interface complète du parcours wallet.

Le SDK n’est pas chargé côté serveur. Son chargement est différé afin de ne pas alourdir inutilement le chargement initial du frontend.

## Étape 2 — Consentement explicite

La création du wallet n’est proposée qu’à un utilisateur authentifié dont l’adresse e-mail est vérifiée.

L’interface indique que :

- le wallet est facultatif ;
- le compte reste utilisable en cas de refus ;
- le wallet servira aux acquisitions numériques ;
- l’utilisateur conserve le contrôle ;
- la connexion d’un wallet externe pourra être ajoutée ultérieurement.

Le choix est envoyé à `POST /api/wallets/consent`. Un refus n’entraîne aucune création et peut être modifié plus tard.

## Étape 3 — Création et activation

Le parcours exécuté est le suivant :

1. enregistrement du consentement ;
2. création d’une demande locale `PENDING` ;
3. récupération d’un JWT CDP limité à l’utilisateur et au wallet ;
4. authentification du navigateur auprès de Coinbase CDP ;
5. création ou récupération de l’EOA EVM ;
6. envoi de l’adresse au backend ;
7. vérification de la propriété et activation locale ;
8. affichage du statut `ACTIVE`.

Les appels utilisent une clé d’idempotence. Une nouvelle tentative ne doit donc pas créer de doublon. Les timeouts et erreurs CDP produisent un statut d’échec ou de relance sans déconnecter l’utilisateur et sans bloquer le reste du compte.

Le rate limit de création et de relance a été testé. Une erreur dans la génération de sa clé a été corrigée dans `backend/src/middlewares/rate-limit.middleware.js`, afin que les requêtes répétées depuis la même adresse soient correctement regroupées et refusées avec HTTP 429.

## Étape 4 — Page wallet

La page `frontend/pages/wallet.vue` affiche maintenant le wallet sans sidebar de profil.

Les informations disponibles sont :

- adresse publique abrégée ;
- copie de l’adresse complète ;
- type de wallet intégré ;
- statut ;
- réseau Base ;
- fournisseur Coinbase CDP ;
- lien vers l’adresse sur BaseScan ;
- reprise ou relance après échec ;
- export sécurisé via l’iframe Coinbase.

Les états pris en charge sont :

- e-mail non vérifié ;
- aucun consentement ;
- consentement refusé ;
- consentement accepté ;
- création en cours ;
- actif ;
- échec ;
- relance requise ;
- dissocié.

La présentation utilise les conventions du profil personnel : fond noir, sections gris foncé, bordures slate, texte blanc/gris et violet réservé aux actions. Les fonds bleu foncé ont été supprimés. La sidebar et son entrée Wallet ne sont pas utilisées sur cette page.

## Étape 5 — Tests

Les tests frontend couvrent :

- consentement accepté et refusé ;
- blocage avant vérification de l’e-mail ;
- tous les statuts persistés ;
- génération des clés d’idempotence ;
- récupération d’un compte EVM existant ;
- copie de l’adresse complète ;
- ouverture de l’export après authentification ;
- refus de l’export pour un wallet dissocié ;
- conversion des erreurs CDP ;
- expiration d’une opération après timeout.

Les tests backend couvrent notamment :

- émission du JWT pour un wallet autorisé ;
- refus pour un wallet dissocié ;
- impossibilité de consulter le wallet d’un autre utilisateur ;
- limitation des créations et relances répétées.

## Résultats de validation

- wallet Base créé et affiché avec le statut `ACTIVE` ;
- adresse publique et lien BaseScan disponibles ;
- export sécurisé intégré dans une iframe CDP ;
- relance et états d’échec disponibles ;
- 62 tests frontend réussis ;
- 290 tests backend réussis lors de la validation complète ;
- lint frontend réussi ;
- lint backend réussi ;
- typecheck Nuxt réussi ;
- formatage Prettier réussi ;
- build Nuxt de production réussi ;
- route `/wallet` accessible en HTTP 200 ;
- aucun changement fonctionnel apporté aux œuvres, au panier ou aux achats.

## Sécurité conservée

- aucune clé privée n’est stockée par Make It Art ;
- la clé privée n’est pas transmise au backend ;
- l’export est rendu par le cadre sécurisé Coinbase ;
- les secrets CDP restent côté backend ;
- le frontend ne reçoit que l’identifiant public du projet ;
- le JWT CDP est temporaire et distinct de la session Make It Art ;
- l’accès au wallet est contrôlé par l’identité de l’utilisateur connecté ;
- les erreurs techniques restent non bloquantes pour le compte.

# Jour 3 — Étape 1 : contrôles

## Statut

Les contrôles automatisés sont validés. La clôture fonctionnelle reste soumise à deux actions : rotation des clés CDP exposées pendant le diagnostic local et confirmation manuelle de l’ouverture de l’iframe d’export après cette rotation.

## Environnement de validation

- backend : conteneur Docker Node.js 22 ;
- frontend : Nuxt dans le conteneur du projet et build local ;
- base : PostgreSQL 16 du Docker Compose ;
- réseau wallet : Base ;
- wallet local de contrôle : statut `ACTIVE`.

Les tests backend lancés directement sous Windows ont d’abord échoué parce que le `node_modules` local ne contenait pas `stripe` et `@zxcvbn-ts/core`, avec Node.js 25 au lieu de Node.js 22. Cette anomalie est limitée au poste Windows. Aucun code et aucun fichier de dépendances n’ont été modifiés pour la contourner. Les validations de référence ont été exécutées dans Docker.

## Résultats automatisés

- backend : 290 tests réussis ;
- frontend : 62 tests réussis ;
- lint backend : réussi ;
- lint frontend : réussi ;
- contrôle Prettier backend : réussi ;
- contrôle Prettier frontend : réussi ;
- typecheck Nuxt : réussi ;
- validation du schéma Prisma : réussie ;
- statut Prisma de la base locale : 33 migrations, aucune migration en attente ;
- build frontend Nuxt : réussi ;
- build de l’image Docker backend : réussi ;
- scan du bundle frontend : aucun marqueur de clé privée CDP ou de secret CDP trouvé.

Le build frontend conserve des avertissements non bloquants de taille de chunks et de durée de plugins. Ils n’empêchent pas la production du bundle.

## Migrations

Deux bases temporaires ont été créées sans modifier la base locale principale :

1. une base vide ;
2. une copie de la base locale représentant une copie de préproduction.

Résultats :

- les 33 migrations ont été appliquées avec succès sur la base vide ;
- la table `Wallet` a été créée correctement ;
- la copie contenait déjà les 33 migrations et aucune migration supplémentaire n’était requise ;
- le wallet `ACTIVE` et son adresse ont été conservés sur la copie ;
- les deux bases temporaires ont été supprimées après validation ;
- la base principale `makeitart` est restée intacte avec un wallet.

## Contrôles wallet ciblés

Les tests ciblés confirment :

- consentement obligatoire ;
- blocage d’un utilisateur non vérifié ;
- création idempotente en cas de double appel ;
- récupération d’un compte EVM existant ;
- expiration contrôlée après timeout ;
- panne CDP convertie en erreur contrôlée ;
- relance après échec ;
- limitation des relances fréquentes ;
- refus d’accès au wallet d’un autre utilisateur ;
- refus d’authentification d’un wallet dissocié ;
- authentification autorisée pour un wallet actif ;
- export ouvert seulement après authentification ;
- absence de token CDP et de secret dans les réponses du service.

Les routes locales suivantes répondent avec HTTP 200 :

- `/` ;
- `/wallet` ;
- `/api/health` ;
- `/api/.well-known/jwks.json`.

## Contrôles manuels restants

Le contrôle automatisé du navigateur local est bloqué par une restriction ACL Windows. Les actions suivantes doivent être confirmées dans le navigateur déjà authentifié :

1. recharger `/wallet` avec `Ctrl + F5` ;
2. cliquer sur `Export wallet securely` ;
3. vérifier que l’iframe Coinbase s’ouvre sans réponse HTTP 409 ;
4. vérifier que la fermeture et la réouverture de la page conservent le wallet `ACTIVE` ;
5. vérifier qu’aucune clé privée, aucun JWT CDP et aucun secret n’apparaît dans Network ou Console.

## Action de sécurité obligatoire

Les anciennes valeurs de la clé API CDP et de la clé privée d’authentification ont été affichées pendant un diagnostic local. Elles doivent être considérées comme compromises.

Avant toute production :

1. révoquer l’ancienne clé API CDP ;
2. créer une nouvelle clé API CDP ;
3. générer une nouvelle paire de clés d’authentification ;
4. remplacer les valeurs dans les fichiers `.env` locaux non versionnés ;
5. redémarrer le backend ;
6. vérifier le JWKS ;
7. refaire la création du jeton et l’export sécurisé.

Tant que cette rotation et le test manuel d’export ne sont pas confirmés, l’étape 1 du Jour 3 reste validée techniquement mais non clôturée pour la production.

# Jour 3 — Étapes 2 à 4

## Étape 2 — Non-régressions

Après intégration de `main`, les contrôles automatisés passent :

- backend : 290 tests sur 290 ;
- frontend : 64 tests sur 64 ;
- inscription, vérification e-mail, connexion classique et Google couvertes ;
- comptes existants, publication, panier et achats couverts ;
- cycle Wallet, timeout, relance, export et contrôle de propriété couverts ;
- SDK Coinbase chargé dynamiquement uniquement par le plugin client ;
- aucun marqueur de clé privée ou secret CDP détecté dans le bundle frontend.

## Étape 3 — Préparation du déploiement

Le déploiement réel n’a pas été lancé. La fusion Git est encore ouverte et aucun commit ni push n’est autorisé.

La préparation comprend :

- `WALLET_FEATURE_ENABLED=false` ajouté au modèle de production ;
- le backend désactive par défaut les nouvelles créations en environnement `production` ;
- le flag bloque l’acceptation d’un nouveau consentement, le démarrage d’une création et une relance ;
- la consultation d’un wallet existant et son export restent disponibles lorsque le flag est désactivé ;
- aucune migration, sauvegarde ou configuration de production n’a été exécutée sur une infrastructure distante.

Le déploiement restera à effectuer après finalisation Git : sauvegarde, secrets de production, Base Mainnet, domaines, migrations, backend, frontend, tests de santé, activation contrôlée et wallet de contrôle.

## Étape 4 — Surveillance

Les données persistées permettent de suivre sans secret :

- décisions de consentement dans `WalletConsent` ;
- créations et états dans `Wallet` ;
- réussites avec le statut `ACTIVE` ;
- échecs et timeouts avec `status` et `lastErrorCode` ;
- wallets en attente ou nécessitant une relance.

Le volume facturé reste contrôlé depuis le portail Coinbase CDP. Le suivi historique exact des tentatives de relance et des doublons bloqués nécessitera des événements opérationnels persistés ou une plateforme de métriques lors du déploiement. Aucun token, secret, JWT ou matériel cryptographique ne doit être envoyé à cette surveillance.