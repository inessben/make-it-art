# Wallet Coinbase CDP sur Base

## 1. Périmètre

Make It Art propose un portefeuille intégré Coinbase Developer Platform sur le réseau Base. Cette fonction est facultative et séparée de la création du compte principal.

Le wallet est créé uniquement lorsque :

1. l’utilisateur est authentifié ;
2. son adresse e-mail est vérifiée ;
3. il accepte explicitement la création du wallet ;
4. Coinbase valide le jeton d’authentification personnalisé ;
5. le frontend confirme au backend l’adresse créée.

La création est idempotente : une relance ne doit pas produire plusieurs wallets pour le même utilisateur et le même réseau.

## 2. Modèle de sécurité

- réseau : Base ;
- type : wallet intégré non custodial ;
- fournisseur : Coinbase CDP ;
- identité : JWT utilisateur court signé par le backend ;
- vérification : clé publique exposée en JWKS ;
- clé privée : jamais reçue, stockée ni journalisée par Make It Art ;
- export : effectué dans l’interface sécurisée fournie par Coinbase ;
- secrets serveur : exclusivement dans l’environnement du backend.

Une adresse publique peut être stockée et affichée. Elle n’est pas un secret.

## 3. Parcours utilisateur

### États principaux

- e-mail non vérifié : activation indisponible ;
- consentement indécis : choix proposé ;
- consentement refusé : aucun wallet créé ;
- prêt : création possible ;
- création en cours : requête protégée par timeout ;
- actif : adresse publique, réseau et actions disponibles ;
- échec ou relance requise : aucun wallet activé, bouton de relance sûr.

### Fonctions visibles

- consentir ou refuser ;
- créer le wallet ;
- relancer après timeout ou échec ;
- copier l’adresse publique ;
- ouvrir l’adresse sur BaseScan ;
- exporter la clé via le cadre sécurisé Coinbase.

## 4. API

Les routes sont protégées par authentification et les écritures sont soumises au rate limiting :

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/.well-known/jwks.json` | publier la clé de vérification JWT |
| GET | `/api/wallets/me` | obtenir wallets et consentement de l’utilisateur |
| POST | `/api/wallets/consent` | enregistrer acceptation ou refus |
| POST | `/api/wallets` | réserver/initier une création idempotente |
| POST | `/api/wallets/:id/cdp-token` | obtenir un jeton CDP court pour l’utilisateur |
| POST | `/api/wallets/:id/complete` | confirmer l’adresse créée |
| POST | `/api/wallets/:id/failure` | enregistrer l’échec contrôlé |
| POST | `/api/wallets/:id/retry` | rouvrir une tentative sûre |

Le frontend ne doit jamais considérer le wallet actif avant la confirmation backend.

## 5. Variables d’environnement

### Backend uniquement

```dotenv
CDP_PROJECT_ID=
CDP_AUTH_ISSUER=
CDP_AUTH_AUDIENCE=
CDP_AUTH_KEY_ID=
CDP_AUTH_PRIVATE_KEY=
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
CDP_REQUEST_TIMEOUT_MS=8000
```

Règles :

- `CDP_AUTH_ISSUER` doit être l’URL HTTPS exacte configurée chez Coinbase et correspondre à l’URL publique de l’application ;
- `CDP_AUTH_AUDIENCE` doit correspondre exactement à `CDP_PROJECT_ID` ;
- `CDP_AUTH_KEY_ID` identifie la clé active publiée dans le JWKS ;
- `CDP_AUTH_PRIVATE_KEY` contient la clé privée PKCS#8 avec les retours à la ligne encodés en `\n` si le gestionnaire de secrets l’exige ;
- `CDP_API_KEY_ID` et `CDP_API_KEY_SECRET` appartiennent au même projet ;
- `CDP_REQUEST_TIMEOUT_MS` doit être supérieur ou égal à 1000 ;
- aucune de ces valeurs ne doit être préfixée par `NUXT_PUBLIC_`.

### Frontend public

```dotenv
NUXT_PUBLIC_CDP_PROJECT_ID=
```

Cette valeur est un identifiant public de projet, pas une clé secrète. Elle doit être identique au `CDP_PROJECT_ID` du backend pour l’environnement ciblé.

## 6. Configuration Coinbase — test

1. utiliser un projet CDP distinct de la production ;
2. autoriser le domaine local exact utilisé, par exemple `http://localhost` ou `http://localhost:3000` ;
3. activer l’authentification personnalisée ;
4. renseigner l’URL JWKS accessible par Coinbase si le test n’est pas strictement local ;
5. aligner issuer, audience et claim utilisateur `sub` ;
6. générer une clé API serveur propre au projet ;
7. révoquer toute clé montrée, copiée dans un journal ou devenue inutile.

## 7. Configuration Coinbase — production

Pour `https://www.makeitart.io` :

1. sélectionner le projet CDP de production, jamais le projet de test ;
2. ajouter le domaine HTTPS exact autorisé ;
3. configurer l’URL JWKS : `https://www.makeitart.io/api/.well-known/jwks.json` ;
4. configurer l’issuer exact : `https://www.makeitart.io` ;
5. configurer l’audience avec l’identifiant réel du projet de production ;
6. utiliser `sub` comme identifiant utilisateur ;
7. générer une clé API serveur dédiée et active ;
8. injecter les valeurs correspondantes dans les secrets du VPS ;
9. redémarrer proprement backend et frontend après reconstruction ;
10. ne pas mélanger identifiants, clés ou domaines test et production.

L’allowlist IP est recommandée uniquement si l’opérateur connaît une IP publique sortante fixe du VPS. En l’absence de maîtrise de cette IP, ne pas saisir une valeur inventée ; documenter le choix compensatoire et limiter strictement les permissions de la clé.

## 8. Rotation et révocation

Révoquer une clé signifie la rendre définitivement inutilisable depuis le portail Coinbase.

Procédure :

1. créer une nouvelle clé dans le bon projet ;
2. installer la nouvelle clé dans le gestionnaire de secrets ;
3. redémarrer et tester le service ;
4. révoquer l’ancienne clé ;
5. vérifier qu’aucun fichier Git, journal ou ticket ne contient l’ancienne valeur ;
6. consigner la date et l’opérateur sans copier le secret.

Une clé privée JWT et une clé API Coinbase remplissent des rôles distincts. Elles ne sont ni interchangeables ni publiables.

## 9. Recette locale

Préconditions : utilisateur de test authentifié, e-mail vérifié et services démarrés.

1. ouvrir `/wallet` ;
2. vérifier que le consentement est demandé ;
3. refuser et confirmer qu’aucune création n’est déclenchée ;
4. accepter puis lancer la création ;
5. vérifier que l’état devient actif et qu’une adresse `0x…` apparaît ;
6. rafraîchir la page et confirmer la persistance ;
7. ouvrir BaseScan ;
8. tester l’export dans un lieu privé ;
9. simuler timeout ou indisponibilité et vérifier la relance sans doublon ;
10. contrôler que les journaux ne contiennent aucun jeton ou secret.

## 10. Recette production

Utiliser un compte de recette dédié et aucun actif de valeur :

1. vérifier `https://www.makeitart.io/api/.well-known/jwks.json` ;
2. vérifier que la réponse JWKS contient le `kid` attendu sans clé privée ;
3. vérifier le projet et le domaine dans Coinbase ;
4. créer un wallet depuis `/wallet` ;
5. confirmer l’adresse dans l’application et le portail Coinbase ;
6. vérifier BaseScan sur le bon réseau ;
7. tester le rechargement et la relance ;
8. tester l’export sécurisé ;
9. examiner les codes HTTP et journaux backend ;
10. supprimer toute donnée de diagnostic sensible.

## 11. Diagnostic

### `AUTHENTICATION: unknown: Network Error`

Vérifier dans cet ordre :

1. accessibilité publique du JWKS ;
2. certificat TLS et redirections ;
3. correspondance exacte de l’issuer ;
4. correspondance exacte audience/projet ;
5. `kid` identique entre JWT et JWKS ;
6. projet public Nuxt identique au projet backend ;
7. domaine autorisé dans Coinbase ;
8. clé API active dans le bon projet ;
9. absence de mélange test/production ;
10. erreurs réseau et CORS dans l’onglet Network du navigateur.

### `409 Conflict` sur `/cdp-token`

Le backend protège l’état de création. Recharger l’état via `/api/wallets/me`, puis utiliser la route de relance si le wallet est en échec ou `retry_required`. Ne pas contourner l’état en créant un second enregistrement.

### Timeout

La tentative doit passer dans un état récupérable. Attendre brièvement puis utiliser le bouton de relance. Vérifier ensuite la disponibilité Coinbase et la valeur de `CDP_REQUEST_TIMEOUT_MS`.

## 12. Données et suppression de compte

Aucun parcours complet de suppression de compte n’est actuellement proposé. Tant qu’il n’existe pas, aucune logique supplémentaire de blocage liée au wallet n’est nécessaire. Si ce parcours est ajouté, il devra empêcher une suppression irréversible tant que l’utilisateur n’a pas confirmé la récupération ou l’export de son wallet.

## 13. Coûts

La création d’un wallet ne nécessite pas que l’utilisateur paie des frais on-chain. Des coûts peuvent apparaître lors d’opérations blockchain ultérieures, selon le réseau, l’action, le paymaster éventuel et la tarification Coinbase en vigueur. Les tarifs doivent être vérifiés dans les sources officielles avant activation d’une nouvelle opération.

## 14. Historique technique

Le détail de l’analyse et des travaux réalisés est conservé dans [`analysis.md`](analysis.md). Ce README remplace les anciens plans quotidiens et constitue désormais la source de vérité opérationnelle.