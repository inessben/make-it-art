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
