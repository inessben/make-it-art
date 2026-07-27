# Epic DEV9 — Paiement Stripe réel et sécurisé

> **Milestone :** M5 — E-Commerce Ready  
> **Statut audité le 24 juillet 2026 :** cœur paiement et effets asynchrones implémentés ; politique France B2C codée ; configuration Dashboard, valeurs légales/fiscales et preuves live encore à fermer avant activation
> **Date :** 18 juillet 2026  
> **Périmètre initial :** achats ponctuels d'œuvres numériques en EUR

## 1. Objectif

Permettre à un collectionneur authentifié de payer réellement une commande avec Stripe, sans que Make It Art ne collecte ni ne stocke ses données de carte, puis de recevoir ses droits d'accès uniquement après une confirmation fiable du paiement par Stripe.

Le résultat attendu couvre :

- un vrai `POST /api/v1/orders/checkout` ;
- Stripe Payment Element, basé sur Stripe Elements ;
- le parcours carte au lancement ; Apple Pay et Google Pay après leur recette réelle ;
- l'authentification forte 3D Secure/SCA ;
- les webhooks Stripe signés et idempotents ;
- la confirmation, les échecs, les reprises et les remboursements ;
- la protection des données, la traçabilité et les tests de sécurité.

## 2. Décision d'architecture

Le checkout de Make It Art utilise actuellement **Stripe Payment Element + PaymentIntent** dans une page hébergée par Make It Art.

Stripe recommande désormais **Checkout Sessions avec `ui_mode: custom` + Payment Element** pour la plupart des paiements ponctuels. Le maintien temporaire de PaymentIntents est assumé pour le lancement carte parce que Make It Art contrôle déjà ses snapshots, réservations de stock, reprises et rapprochements. La migration vers Checkout Sessions custom est décidée et doit précéder taxes, remises, B2B, vente hors France ou nouveaux moyens de paiement (`PAY-US-16`).

- `POST /api/v1/orders/checkout` crée ou réutilise un `PaymentIntent` côté serveur.
- Le navigateur reçoit seulement le `client_secret` nécessaire à Stripe.js.
- Le client confirme le paiement avec `stripe.confirmPayment(...)`.
- Le serveur considère `payment_intent.succeeded`, reçu sur un webhook signé ou relu directement depuis l'API Stripe par le job de rapprochement, comme la preuve canonique du paiement.
- Une redirection vers la page de confirmation n'est jamais une preuve de paiement.
- Cette architecture n'utilise pas Stripe Checkout hébergé : l'événement `checkout.session.completed` mentionné dans l'ancien cahier des charges n'est donc pas requis.

## 3. Priorités

| Priorité | Signification                                                                  |
| -------- | ------------------------------------------------------------------------------ |
| **P0**   | Obligatoire avant d'accepter un paiement réel                                  |
| **P1**   | Obligatoire pour le cycle après-vente, livrable juste après le MVP de paiement |

Ordre recommandé : `PAY-US-01` → `02` → `03` → `04` → `05` → `06` → `07` → `08` → `10` → `11`, puis `PAY-US-09`, `12`, `13` et `14`.

## 4. Règles de sécurité non négociables

1. Le backend recalcule toujours les prix, la devise, la commission et la disponibilité depuis ses propres données.
2. Tous les montants monétaires sont stockés et envoyés à Stripe en unités mineures entières : `1099` représente `10,99 EUR`.
3. La clé secrète Stripe, le secret de webhook, le PAN, le CVC et le `client_secret` ne sont jamais stockés dans le frontend, les URLs, les logs ou les outils d'analytics.
4. Les données de carte sont saisies uniquement dans le Payment Element hébergé par Stripe et ne transitent jamais par l'API Make It Art.
5. Toute opération modifiant un paiement est authentifiée, autorisée, protégée contre le rejeu et idempotente.
6. Les environnements Stripe sandbox et production utilisent des clés, des webhooks et des secrets distincts.
7. Le paiement en production est servi uniquement en HTTPS, sans contenu mixte.
8. Seul un webhook Stripe valide ou une relecture serveur authentifiée de ce même `PaymentIntent` peut faire passer une commande à `PAID` et déclencher la livraison.
9. Un événement dupliqué, retardé ou reçu dans le désordre ne doit produire ni double débit ni double livraison.
10. Aucun accès à une commande ne repose sur la difficulté à deviner son identifiant : l'autorisation du propriétaire est vérifiée à chaque requête.

## 5. États métier minimaux

Les statuts métier de la commande restent distincts des statuts techniques du `PaymentIntent` Stripe.

| Statut commande      | Sens                                      | Livraison autorisée                   |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `PENDING_PAYMENT`    | Commande créée, paiement non confirmé     | Non                                   |
| `PAYMENT_PROCESSING` | Paiement en traitement chez Stripe        | Non                                   |
| `PAYMENT_FAILED`     | Tentative refusée ou échouée              | Non                                   |
| `PAYMENT_REVIEW`     | Incohérence nécessitant une revue humaine | Non                                   |
| `PAID`               | Paiement confirmé par webhook valide      | Oui, une seule fois                   |
| `CANCELED`           | Commande abandonnée ou annulée            | Non                                   |
| `PARTIALLY_REFUNDED` | Une partie du paiement a été remboursée   | Selon la politique de remboursement   |
| `REFUNDED`           | Paiement intégralement remboursé          | Aucun nouveau droit ne doit être émis |

Les transitions sont contrôlées côté serveur. Un événement ancien ne peut pas faire régresser une commande déjà `PAID` vers `PAYMENT_FAILED`.

---

## 6. User stories et critères d'acceptation

### PAY-US-01 — Poser une fondation monétaire et Stripe sûre

**Priorité :** P0  
**Dépendance :** aucune  
**Statut :** ✅ Implémentée le 18 juillet 2026, auditée le 19 juillet 2026

**En tant que** collectionneur,  
**je veux** que le montant et l'état de ma commande soient enregistrés sans ambiguïté,  
**afin de** ne jamais être débité d'un montant différent de celui que j'ai accepté.

#### Critères d'acceptation

- **AC-01 — Montants :** Étant donné une commande, quand son prix est persisté, alors le total, les taxes, les frais, la commission et les prix unitaires sont des entiers en unités mineures, jamais des nombres flottants ni des chaînes libres.
- **AC-02 — Devise :** Étant donné un paiement, quand il est créé, alors sa devise ISO est explicite, normalisée en majuscules et identique sur la commande, le paiement et le `PaymentIntent`.
- **AC-03 — Snapshot :** Étant donné un panier validé, quand la commande est créée, alors chaque ligne conserve un snapshot du titre, de l'artiste, du prix, de la commission, de la quantité et de la devise acceptés.
- **AC-04 — Identifiants :** Étant donné un paiement Stripe, quand il est persisté, alors son `payment_intent.id` alphanumérique est stocké dans un champ chaîne unique ; le champ actuel `transactionId Int?` n'est pas utilisé à cette fin.
- **AC-05 — États :** Étant donné une commande ou un paiement, quand son statut change, alors la valeur est non nulle, appartient à un ensemble contraint et respecte une transition autorisée.
- **AC-06 — Identifiant public :** Étant donné une commande exposée dans l'API, quand son identifiant est retourné, alors un identifiant public non séquentiel est utilisé et la clé primaire interne n'est pas suffisante pour autoriser l'accès.
- **AC-07 — Idempotence locale :** Étant donné un événement Stripe, quand il est reçu, alors son `event.id`, son type, l'identifiant de l'objet Stripe et sa date de traitement peuvent être enregistrés avec une contrainte d'unicité.
- **AC-08 — Données interdites :** Étant donné les modèles de données, quand leur schéma est inspecté, alors aucun champ ne permet de stocker PAN, CVC, clé Stripe secrète ou `client_secret`.

### PAY-US-02 — Construire un panier serveur fiable

**Priorité :** P0  
**Dépendance :** `PAY-US-01`  
**Statut :** ✅ Implémentée le 18 juillet 2026, protection CSRF renforcée le 19 juillet 2026

**En tant que** collectionneur,  
**je veux** revoir un panier dont le prix et la disponibilité sont fiables,  
**afin de** consentir au bon montant avant de payer.

#### Critères d'acceptation

- **AC-01 — Propriétaire :** Étant donné un panier, quand il est lu ou modifié, alors l'utilisateur doit être authentifié et ne peut accéder qu'à son propre panier.
- **AC-02 — Source de vérité :** Étant donné un article envoyé par le navigateur, quand le panier est calculé, alors le serveur utilise uniquement l'identifiant et la quantité demandée puis relit le prix, la devise et la disponibilité en base.
- **AC-03 — Manipulation :** Étant donné un prix, une commission ou un total falsifié dans la requête, quand le serveur traite le panier, alors la valeur falsifiée est ignorée ou la requête est rejetée ; elle n'est jamais facturée telle quelle.
- **AC-04 — Disponibilité :** Étant donné une œuvre unique ou une édition limitée indisponible, quand le checkout est demandé, alors le serveur répond `409 Conflict`, ne crée aucun paiement et explique quel article doit être retiré.
- **AC-05 — Concurrence :** Étant donné deux clients achetant le dernier exemplaire, quand ils valident simultanément, alors une transaction et un verrou ou mécanisme de réservation garantissent qu'un seul peut poursuivre le paiement.
- **AC-06 — Récapitulatif :** Étant donné un panier payable, quand la page checkout s'affiche, alors le client voit les articles, les quantités, le total, la devise et les frais avant le bouton de paiement.
- **AC-07 — Changement de prix :** Étant donné que le prix change après l'affichage du panier, quand le checkout débute, alors le nouveau total est présenté au client et exige une nouvelle confirmation ; aucun débit silencieux n'est tenté.

### PAY-US-03 — Créer un checkout serveur idempotent

**Priorité :** P0  
**Dépendances :** `PAY-US-01`, `PAY-US-02`  
**Statut :** ✅ Implémentée le 18 juillet 2026, réutilisation inter-snapshot bloquée le 19 juillet 2026

**En tant que** collectionneur,  
**je veux** initialiser mon paiement de manière fiable,  
**afin de** ne pas créer plusieurs débits si je clique deux fois ou si le réseau coupe.

#### Critères d'acceptation

- **AC-01 — Route :** Étant donné un utilisateur authentifié et vérifié avec un panier payable, quand il appelle `POST /api/v1/orders/checkout`, alors le serveur crée une commande `PENDING_PAYMENT` et un `PaymentIntent`, ou réutilise ceux déjà associés à la même version du panier.
- **AC-02 — Autorisation :** Étant donné un utilisateur absent, non vérifié ou ne possédant pas la commande, quand il appelle la route, alors la réponse est respectivement `401`, `403` ou `404` et aucun objet Stripe n'est créé.
- **AC-03 — Total serveur :** Étant donné la création du `PaymentIntent`, quand son montant est envoyé à Stripe, alors il provient du snapshot serveur de la commande et non du corps de la requête.
- **AC-04 — Idempotency-Key :** Étant donné deux requêtes identiques avec la même clé d'idempotence et la même version de commande, quand elles sont traitées, alors elles retournent la même commande et le même `PaymentIntent` sans double création.
- **AC-05 — Contrainte locale :** Étant donné que l'idempotence Stripe n'est pas une conservation permanente, quand la clé expire chez Stripe, alors l'unicité locale commande/version/`PaymentIntent` empêche toujours un second paiement concurrent.
- **AC-06 — Réponse minimale :** Étant donné un checkout créé, quand l'API répond, alors elle retourne uniquement l'identifiant public de commande, le `client_secret` nécessaire et les données d'affichage non sensibles ; elle ne retourne jamais l'objet Stripe complet ni une clé secrète.
- **AC-07 — Non-cache :** Étant donné une réponse contenant un `client_secret`, quand elle est envoyée, alors elle utilise `Cache-Control: no-store` et son contenu est exclu des logs, traces, analytics et outils de remontée d'erreurs.
- **AC-08 — Protection HTTP :** Étant donné la route checkout, quand elle reçoit des appels, alors elle applique validation de schéma, protection CSRF adaptée aux cookies de session, CORS en liste fermée et limitation de débit par utilisateur et IP.

### PAY-US-04 — Payer avec Stripe Payment Element et SCA

**Priorité :** P0  
**Dépendance :** `PAY-US-03`  
**Statut :** ✅ Implémentée le 18 juillet 2026

**En tant que** collectionneur,  
**je veux** saisir et confirmer mon moyen de paiement dans un composant Stripe sécurisé,  
**afin de** protéger mes données bancaires et réussir l'authentification 3D Secure si elle est demandée.

#### Critères d'acceptation

- **AC-01 — Stripe.js :** Étant donné la page checkout, quand elle charge Stripe, alors Stripe.js provient directement de `js.stripe.com` et n'est ni copié, ni auto-hébergé, ni intégré au bundle applicatif.
- **AC-02 — Clés :** Étant donné le frontend, quand sa configuration est inspectée, alors seule la clé publiable `pk_*` est exposée ; aucune clé `sk_*`, `rk_*` ou `whsec_*` n'est présente.
- **AC-03 — Données carte :** Étant donné la saisie d'une carte, quand le client remplit le formulaire, alors PAN et CVC restent dans le Payment Element et ne transitent jamais par une route, un store, un log ou un champ Make It Art.
- **AC-04 — Intégration :** Étant donné le Payment Element, quand il est rendu, alors il n'est pas placé dans un iframe applicatif supplémentaire et la Content Security Policy autorise uniquement les domaines Stripe officiellement requis.
- **AC-05 — Soumission :** Étant donné un formulaire valide, quand le client paie, alors le frontend appelle `elements.submit()` puis `stripe.confirmPayment(...)`, bloque le bouton pendant l'opération et empêche une double soumission.
- **AC-06 — SCA/3DS :** Étant donné que Stripe exige une action, quand le paiement est confirmé, alors le parcours gère `requires_action`, 3D Secure, redirection, succès, refus et annulation sans contourner l'authentification.
- **AC-07 — Retour sûr :** Étant donné une redirection Stripe, quand un `return_url` est fourni, alors il utilise une origine HTTPS autorisée de Make It Art ; aucune URL fournie librement par le client n'est acceptée.
- **AC-08 — Wallets :** Étant donné un appareil et un compte compatibles, quand Apple Pay ou Google Pay est activé dans Stripe et que le domaine est enregistré, alors le moyen de paiement peut être proposé par le Payment Element sans modifier le contrôle serveur du montant.
- **AC-09 — UX sûre :** Étant donné une erreur de paiement, quand elle est affichée, alors le message est compréhensible, accessible et non technique, sans révéler règle antifraude, secret ou donnée bancaire.

### PAY-US-05 — Recevoir un webhook Stripe signé et idempotent

**Statut :** ✅ Implémentée le 18 juillet 2026

**Priorité :** P0  
**Dépendances :** `PAY-US-01`, configuration Stripe sandbox

**En tant que** collectionneur,  
**je veux** que Make It Art vérifie directement auprès de Stripe l'issue de mon paiement,  
**afin de** ne pas perdre mon achat et d'empêcher une fausse confirmation.

#### Critères d'acceptation

- **AC-01 — Corps brut :** Étant donné `POST /api/v1/webhooks/stripe`, quand une requête arrive, alors les octets bruts exacts sont fournis au SDK Stripe avant tout `express.json()` ou autre transformation du corps.
- **AC-02 — Signature :** Étant donné un webhook, quand il est traité, alors le serveur vérifie `Stripe-Signature` avec le SDK officiel et le secret correspondant exactement à l'environnement et à l'endpoint.
- **AC-03 — Rejet :** Étant donné une signature absente, invalide ou expirée, quand la vérification échoue, alors le serveur répond `400` et ne modifie aucune commande, aucun paiement et aucun droit.
- **AC-04 — Anti-rejeu :** Étant donné la vérification de signature, quand l'horodatage est contrôlé, alors la tolérance Stripe recommandée reste active, n'est jamais mise à zéro et l'horloge du serveur est synchronisée.
- **AC-05 — Doublons :** Étant donné un `event.id` déjà traité, quand Stripe le renvoie, alors le serveur répond sans rejouer les transitions, emails, réservations ou droits d'accès.
- **AC-06 — Désordre :** Étant donné des événements reçus dans le désordre, quand ils sont traités, alors les règles de transition et, si nécessaire, une relecture de l'objet Stripe empêchent toute régression d'état.
- **AC-07 — Événements minimaux :** Étant donné la configuration de l'endpoint, quand elle est inspectée, alors seuls les événements utiles sont abonnés, au minimum `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed` et `payment_intent.canceled`.
- **AC-08 — Réponse rapide :** Étant donné un événement valide, quand il est reçu, alors il est enregistré durablement puis acquitté rapidement en `2xx` ; les emails et autres tâches lentes sont exécutés de façon asynchrone et rejouable.
- **AC-09 — Transport :** Étant donné l'environnement de production, quand Stripe appelle l'endpoint, alors celui-ci est en HTTPS TLS 1.2 ou 1.3, n'effectue aucune redirection et utilise un secret distinct du sandbox.

### PAY-US-06 — Finaliser une commande exactement une fois

**Statut :** ✅ Implémentée le 19 juillet 2026 — finalisation atomique, worker récupérable, emails, droits et certificats durables présents

**Priorité :** P0  
**Dépendance :** `PAY-US-05`

**En tant que** collectionneur,  
**je veux** que ma commande soit validée une seule fois après le paiement réel,  
**afin de** recevoir exactement les droits correspondant au montant payé.

#### Critères d'acceptation

- **AC-01 — Rattachement :** Étant donné `payment_intent.succeeded`, quand l'événement est traité, alors le paiement local est recherché par le `payment_intent.id` persisté ; une metadata fournie seule ne suffit pas.
- **AC-02 — Cohérence :** Étant donné le `PaymentIntent`, quand il est rapproché de la commande, alors le montant, la devise et l'identifiant attendu doivent correspondre exactement.
- **AC-03 — Anomalie :** Étant donné une différence de montant, devise ou rattachement, quand elle est détectée, alors la commande passe à `PAYMENT_REVIEW`, aucun droit n'est accordé et une alerte opérateur est créée.
- **AC-04 — Atomicité :** Étant donné un paiement valide, quand il est finalisé, alors l'enregistrement de l'événement, le paiement `SUCCEEDED`, la commande `PAID` et la consommation de la réservation sont effectués dans une transaction atomique.
- **AC-05 — Livraison unique :** Étant donné une commande passant à `PAID`, quand les traitements métier démarrent, alors l'email, les droits de téléchargement et le certificat prévus par DEV10 ne sont déclenchés qu'une seule fois.
- **AC-06 — Rejeu :** Étant donné le même événement reçu plusieurs fois ou deux workers concurrents, quand ils le traitent, alors une contrainte d'unicité ou un verrou garantit un seul effet métier.
- **AC-07 — Échec :** Étant donné `payment_intent.payment_failed` ou `payment_intent.canceled`, quand l'événement est valide, alors aucun droit n'est émis et une commande déjà `PAID` ne régresse jamais.
- **AC-08 — Audit :** Étant donné une transition financière, quand elle est appliquée, alors son ancien état, son nouvel état, sa date et l'identifiant Stripe concerné sont auditables sans donnée bancaire.

### PAY-US-07 — Afficher une confirmation fiable et privée

**Statut :** ✅ Implémentée le 19 juillet 2026 — page privée et email asynchrone sécurisé présents

**Priorité :** P0  
**Dépendance :** `PAY-US-06`

**En tant que** collectionneur,  
**je veux** consulter l'état réel de ma commande après mon retour de Stripe,  
**afin de** savoir clairement si mon paiement est confirmé, encore en cours ou échoué.

#### Critères d'acceptation

- **AC-01 — Source serveur :** Étant donné la page de retour, quand elle s'affiche, alors elle appelle un endpoint authentifié tel que `GET /api/v1/orders/:publicId` et n'utilise jamais les paramètres d'URL comme preuve de paiement.
- **AC-02 — Contrôle d'accès :** Étant donné l'identifiant d'une commande appartenant à un autre utilisateur, quand il est demandé, alors l'API répond `404` sans révéler son existence.
- **AC-03 — Données minimales :** Étant donné une réponse de commande, quand elle est sérialisée, alors elle ne contient ni `client_secret`, ni données carte, ni clé Stripe, ni payload brut de webhook.
- **AC-04 — États visibles :** Étant donné une commande `PAYMENT_PROCESSING`, `PAID`, `PAYMENT_FAILED` ou `PAYMENT_REVIEW`, quand elle est affichée, alors le message et l'action proposée correspondent à cet état sans annoncer un faux succès.
- **AC-05 — Attente :** Étant donné un webhook encore en transit, quand la commande est en traitement, alors la page peut rafraîchir son état avec un intervalle limité et un backoff, sans créer un nouveau paiement.
- **AC-06 — Rechargement :** Étant donné un rechargement, une fermeture du navigateur ou un retour ultérieur, quand le client ouvre son historique, alors il retrouve le même état serveur et ne perd pas sa commande.
- **AC-07 — Cache :** Étant donné une réponse contenant des informations de commande, quand elle est envoyée, alors elle utilise une politique de cache privée adaptée, par défaut `Cache-Control: private, no-store`.
- **AC-08 — Email :** Étant donné une commande `PAID`, quand l'email de confirmation est envoyé, alors il ne contient aucune donnée bancaire et ses liens exigent encore une autorisation ou une signature limitée conformément à DEV10.

### PAY-US-08 — Reprendre un paiement sans double débit

**Statut :** ✅ Implémentée le 18 juillet 2026

**Priorité :** P0  
**Dépendances :** `PAY-US-03`, `PAY-US-04`, `PAY-US-07`

**En tant que** collectionneur,  
**je veux** reprendre un paiement interrompu ou refusé sans risque de double débit,  
**afin de** terminer mon achat en confiance.

#### Critères d'acceptation

- **AC-01 — Double clic :** Étant donné deux soumissions simultanées, quand elles arrivent, alors le frontend les bloque et le backend retourne le même paiement grâce à l'idempotence.
- **AC-02 — Perte réseau :** Étant donné une coupure avant ou après `confirmPayment`, quand le client revient, alors l'application relit la commande et le `PaymentIntent` existants avant de proposer une action.
- **AC-03 — Réutilisation :** Étant donné un paiement encore réutilisable et un snapshot de commande inchangé, quand le client réessaie, alors le même `PaymentIntent` est utilisé lorsque Stripe l'autorise.
- **AC-04 — Nouvelle version :** Étant donné un prix, une devise, une disponibilité ou un contenu de panier modifié, quand le client réessaie, alors l'ancien paiement est rendu inutilisable si possible et une nouvelle version exige son consentement explicite.
- **AC-05 — Refus :** Étant donné un paiement refusé, quand le client voit l'erreur, alors aucun droit n'est accordé, le panier reste récupérable et le message ne révèle pas les règles antifraude internes.
- **AC-06 — Abandon :** Étant donné une commande non payée au-delà du délai métier, quand le délai expire, alors elle passe à `CANCELED`, sa réservation est libérée et son `PaymentIntent` est annulé lorsqu'il est encore annulable.
- **AC-07 — Support :** Étant donné une erreur inattendue, quand elle est affichée, alors le client reçoit une référence de support non sensible permettant de retrouver les logs corrélés.

### PAY-US-09 — Rembourser de façon contrôlée

**Statut :** ✅ Implémentée le 19 juillet 2026 — remboursement financier, notification asynchrone et révocation durable des droits présents

**Priorité :** P1  
**Dépendances :** `PAY-US-06`, rôles d'administration et politique de remboursement

**En tant que** collectionneur,  
**je veux** qu'un remboursement accepté soit exécuté et suivi de façon sûre,  
**afin de** récupérer le bon montant sans erreur ni opération cachée.

#### Critères d'acceptation

- **AC-01 — Autorisation forte :** Étant donné une demande de remboursement, quand elle est exécutée, alors seul un rôle autorisé avec une authentification récente peut agir ; l'opération est protégée contre CSRF et auditée.
- **AC-02 — Référence serveur :** Étant donné une commande à rembourser, quand l'appel Stripe est construit, alors le serveur utilise le `PaymentIntent` persisté ; il n'accepte jamais aveuglément un identifiant Stripe fourni par le client.
- **AC-03 — Montant :** Étant donné un remboursement partiel ou total, quand son montant est validé, alors il est entier, strictement positif et inférieur ou égal au solde encore remboursable.
- **AC-04 — Concurrence :** Étant donné deux demandes concurrentes, quand elles sont traitées, alors un verrou et une clé d'idempotence empêchent le sur-remboursement.
- **AC-05 — États :** Étant donné une demande acceptée par l'API Stripe, quand elle est créée, alors elle est affichée comme en cours jusqu'à sa confirmation ; `refund.created`, `refund.updated` et `refund.failed` mettent à jour le résultat final.
- **AC-06 — Commande :** Étant donné un remboursement confirmé, quand il est partiel ou total, alors la commande passe respectivement à `PARTIALLY_REFUNDED` ou `REFUNDED` et conserve son historique financier.
- **AC-07 — Droits numériques :** Étant donné un remboursement total, quand il est confirmé, alors aucun nouveau lien de téléchargement n'est émis et les liens encore actifs sont révoqués selon la politique acceptée par le client.
- **AC-08 — Information client :** Étant donné un changement d'état du remboursement, quand il est confirmé ou échoue, alors le client reçoit une information claire avec la commande, le montant, la devise et, si disponible, la référence bancaire de remboursement.

### PAY-US-10 — Protéger les secrets, les logs et l'exploitation

**Statut :** ✅ Implémentée le 19 juillet 2026 — protections, rapprochement, alertes et supervision des tâches/webhooks présents

**Priorité :** P0  
**Dépendance :** transverse

**En tant que** collectionneur,  
**je veux** que mes traces de paiement soient protégées et surveillées,  
**afin de** limiter l'impact d'une erreur technique ou d'un incident de sécurité.

#### Critères d'acceptation

- **AC-01 — Secrets :** Étant donné la configuration, quand l'application démarre, alors les clés secrètes et secrets de webhook proviennent d'un gestionnaire de secrets ou de variables chiffrées, ne sont pas versionnés et font échouer le démarrage production s'ils sont absents ou de test.
- **AC-02 — Séparation :** Étant donné sandbox et production, quand leurs configurations sont comparées, alors leurs clés, endpoints webhook, secrets et données sont strictement séparés.
- **AC-03 — Moindre privilège :** Étant donné une clé serveur Stripe, quand les permissions nécessaires le permettent, alors une clé restreinte et le moindre privilège sont utilisés.
- **AC-04 — Logs autorisés :** Étant donné une opération de paiement, quand elle est journalisée, alors seuls des identifiants techniques, états, durées et codes d'erreur non sensibles sont conservés ; les corps Stripe complets ne sont pas logués.
- **AC-05 — Redaction :** Étant donné une erreur, quand elle traverse logs, APM, analytics ou suivi frontend, alors clés, `client_secret`, cookies, données carte, adresse et informations personnelles non nécessaires sont supprimés.
- **AC-06 — Défense HTTP :** Étant donné les routes paiement, quand elles sont exposées, alors HTTPS, CORS fermé, en-têtes de sécurité, validation, contrôle d'accès et limites de débit sont actifs ; le webhook utilise sa signature à la place de CSRF.
- **AC-07 — Alertes :** Étant donné des signatures invalides répétées, des webhooks en échec, une commande bloquée en traitement ou un rapprochement incohérent, quand le seuil est dépassé, alors une alerte exploitable est envoyée sans donnée bancaire.
- **AC-08 — Rapprochement :** Étant donné une commande restée dans un état transitoire, quand le délai de surveillance expire, alors un job idempotent relit l'état Stripe et répare ou place la commande en revue sans accorder de droit à tort.
- **AC-09 — Rotation :** Étant donné une suspicion de fuite, quand la procédure d'incident est déclenchée, alors les clés et secrets peuvent être renouvelés sans perdre les événements ni les commandes en cours.
- **AC-10 — Conformité :** Étant donné la mise en production, quand le paiement est audité, alors la responsabilité PCI applicable est documentée ; l'utilisation de Stripe Elements n'est pas présentée comme une conformité automatique.

### PAY-US-11 — Valider la sécurité avant le mode live

**Statut :** ✅ Implémentée le 18 juillet 2026 — preuves Stripe live à compléter avant activation

**Priorité :** P0  
**Dépendances :** toutes les US P0

**En tant que** collectionneur,  
**je veux** que les parcours normaux et hostiles soient testés avant le premier débit réel,  
**afin de** ne pas découvrir une faille avec mon argent.

#### Critères d'acceptation

- **AC-01 — Sandbox :** Étant donné le développement et la CI, quand les tests Stripe s'exécutent, alors ils utilisent exclusivement les clés, moyens de paiement et webhooks de test ; aucune vraie carte n'est saisie.
- **AC-02 — Automatisation :** Étant donné les règles de prix, d'autorisation, d'idempotence et de transition, quand la suite de tests s'exécute, alors les cas critiques sont couverts par des tests unitaires et d'intégration déterministes.
- **AC-03 — Webhooks :** Étant donné Stripe CLI ou un équivalent de test officiel, quand les événements sont simulés, alors signature valide, signature invalide, payload modifié, rejeu, concurrence et ordre inversé sont vérifiés.
- **AC-04 — Paiements :** Étant donné les moyens de paiement de test Stripe, quand les scénarios sont joués, alors succès, refus, `processing`, 3DS réussi, 3DS refusé, 3DS annulé et perte réseau produisent les états attendus.
- **AC-05 — Sécurité applicative :** Étant donné un test hostile, quand un montant, une devise, une quantité, une commande ou un utilisateur est falsifié, alors le serveur rejette l'accès ou applique exclusivement ses valeurs de confiance.
- **AC-06 — Non-régression :** Étant donné un double clic, un double checkout ou un double webhook, quand le scénario termine, alors une seule transaction Stripe, une seule commande payée et une seule livraison existent.
- **AC-07 — Revue :** Étant donné une version candidate, quand elle est évaluée, alors la revue de code, l'analyse de dépendances et les tests de sécurité ne laissent aucune vulnérabilité haute ou critique non traitée.
- **AC-08 — Go-live :** Étant donné le passage en production, quand la checklist est validée, alors clés live, secret live, URL HTTPS, événements abonnés, Payment Method Configuration carte, CSP, alertes et procédure de rotation ont chacun une preuve. Les domaines wallet sont exigés seulement lors de la phase Apple Pay/Google Pay.
- **AC-09 — Arrêt sûr :** Étant donné un incident après déploiement, quand le checkout est désactivé, alors aucun nouveau paiement ne démarre mais les webhooks et la finalisation des paiements déjà engagés continuent de fonctionner.

### PAY-US-12 — Ne jamais rouvrir un paiement Stripe déjà engagé ou terminé

**Statut :** ✅ Implémentée le 19 juillet 2026
**Priorité :** P0
**Dépendances :** `PAY-US-03`, `PAY-US-06`, `PAY-US-08`

**En tant que** collectionneur,
**je veux** que le checkout vérifie l'état réel du `PaymentIntent` avant d'afficher Stripe Elements,
**afin de** ne jamais confirmer une seconde fois un paiement déjà soumis ou encaissé.

#### Critères d'acceptation

- **AC-01 — Liste positive :** Étant donné un `PaymentIntent`, quand le backend prépare ou reprend un checkout, alors un `client_secret` est retourné uniquement pour `requires_payment_method`, `requires_confirmation` ou `requires_action`.
- **AC-02 — Succès terminal :** Étant donné un `PaymentIntent` `succeeded`, quand le checkout le relit, alors la finalisation atomique existante est exécutée, la réponse ne contient aucun `client_secret` et la commande retournée est `PAID`.
- **AC-03 — Traitement engagé :** Étant donné un `PaymentIntent` `processing` ou `requires_capture`, quand le checkout le relit, alors la commande passe à `PAYMENT_PROCESSING`, aucun formulaire de paiement n'est remonté et le client est redirigé vers le suivi.
- **AC-04 — Annulation :** Étant donné un `PaymentIntent` `canceled`, quand il est relu, alors la commande est annulée, les réservations sont libérées et aucun `client_secret` n'est retourné.
- **AC-05 — Finalisation unique :** Étant donné une réconciliation immédiate suivie du webhook Stripe retardé, quand les deux sont traités, alors stock, panier, droits et tâches de livraison ne sont finalisés qu'une fois.
- **AC-06 — Défense frontend :** Étant donné une réponse checkout terminale ou sans `requiresConfirmation`, quand la page la reçoit, alors Stripe Elements n'est jamais créé ni monté et `/payment/return` est ouvert.

### PAY-US-13 — Auto-réparer un webhook de paiement manqué

**Statut :** ✅ Implémentée le 19 juillet 2026
**Priorité :** P0
**Dépendances :** `PAY-US-05`, `PAY-US-06`, `PAY-US-10`, `PAY-US-12`

**En tant que** collectionneur,
**je veux** que Make It Art rapproche automatiquement une commande désynchronisée avec Stripe,
**afin de** recevoir mon achat même si le webhook de succès a été retardé ou perdu.

#### Critères d'acceptation

- **AC-01 — États surveillés :** Étant donné le job de rapprochement, quand il cherche les commandes obsolètes, alors il inspecte `PENDING_PAYMENT`, `PAYMENT_PROCESSING` et `PAYMENT_FAILED`.
- **AC-02 — Relecture authentifiée :** Étant donné une commande surveillée, quand son état est rapproché, alors le backend relit le `PaymentIntent` par son identifiant persistant avec le SDK Stripe et vérifie montant, devise et metadata avant toute transition.
- **AC-03 — Événement déterministe :** Étant donné un état Stripe réconciliable, quand il est appliqué, alors un identifiant technique déterministe rend la réparation idempotente et compatible avec un webhook reçu plus tard.
- **AC-04 — État impossible :** Étant donné `providerStatus=succeeded` ou `payment=SUCCEEDED` avec une commande non `PAID`, quand l'incohérence est détectée, alors elle est journalisée avec uniquement des identifiants techniques et réparée ou placée en revue.
- **AC-05 — Alerte sûre :** Étant donné au moins une incohérence réparée ou une réconciliation en échec, quand le balayage se termine, alors une alerte opérateur agrégée est envoyée sans `client_secret`, donnée bancaire ni donnée personnelle.
- **AC-06 — Aucun faux positif :** Étant donné un `PaymentIntent` encore réutilisable, quand le job le relit, alors il ne marque jamais la commande `PAID` et ne déclenche aucun droit.

### PAY-US-14 — Rendre la récupération du checkout claire et observable

**Statut :** ✅ Implémentée le 19 juillet 2026
**Priorité :** P1
**Dépendances :** `PAY-US-07`, `PAY-US-12`, `PAY-US-13`

**En tant que** collectionneur,
**je veux** comprendre si le prix, le formulaire ou le paiement est vérifié,
**afin de** ne pas repayer à cause d'un message ambigu ou d'une erreur de chargement.

#### Critères d'acceptation

- **AC-01 — Libellé précis :** Étant donné le récapitulatif checkout, quand le prix a été recalculé, alors le badge affiche « Prix vérifié côté serveur » et ne suggère jamais que le paiement est confirmé.
- **AC-02 — Erreur de chargement :** Étant donné un `loaderror` Stripe Elements, quand il survient, alors le bouton de paiement reste désactivé, aucun détail sensible n'est affiché et une action permet de vérifier le statut serveur de la commande.
- **AC-03 — Message anti-double-paiement :** Étant donné une confirmation en attente ou un formulaire indisponible, quand l'utilisateur consulte la page, alors l'interface lui demande explicitement de ne pas soumettre un nouveau paiement avant la vérification.
- **AC-04 — Tests de non-régression :** Étant donné la suite automatisée, quand elle s'exécute, alors elle couvre succès retrouvé sans webhook, traitement, annulation, reprise autorisée, webhook tardif, état `PAYMENT_FAILED` réparé et refus frontend de monter un paiement terminal.

### PAY-US-15 — Décider et implémenter le traitement fiscal avant le live

**Statut :** ✅ Politique France B2C implémentée le 24 juillet 2026 ; preuves et valeurs de production à fournir avant activation

**Priorité :** P0

**Dépendances :** identité légale Make It Art et taux B2C français validé pour la configuration live

**En tant que** responsable de la plateforme,
**je veux** que taxes et TVA soient traitées selon une décision validée,
**afin de** ne pas encaisser des commandes avec un `taxAmount = 0` supposé à tort.

#### Critères d'acceptation

- **AC-01 — Périmètre fermé :** Make It Art est le marchand officiel ; seules les ventes `B2C`, en EUR, avec adresse de facturation `FR` sont acceptées. Les champs professionnels et les autres pays sont refusés côté serveur.
- **AC-02 — Prix TTC :** le panier, la commande et la facture figent en centimes le brut avant réduction, la réduction, le montant HT, le taux, la TVA incluse et le TTC. La production exige un taux explicitement validé et ne le déduit jamais de Stripe.
- **AC-03 — Facturation client :** après un paiement confirmé, l'outbox produit une facture de vente Make It Art → client, numérotée séquentiellement, issue des snapshots immuables et téléchargeable uniquement par le propriétaire.
- **AC-04 — Aucune fausse activation :** `STRIPE_TAX_ENABLED=false` est imposé en phase 1. Aucun `automatic_tax` ni Tax Calculation n'est activé implicitement.
- **AC-05 — Phase 2 fermée :** avant B2B ou vente hors France, une inscription fiscale active, les codes fiscaux des œuvres, l'adresse requise, la collecte d'identifiant TVA, Stripe Tax et les corrections de remboursement sont validés en sandbox.
- **AC-06 — Preuves live :** l'identité légale de l'émetteur, le numéro d'immatriculation, le numéro de TVA, le taux B2C et un exemple de facture sont revus par les responsables fiscal/comptable avant `PAYMENT_FISCAL_POLICY_ACK=true`.

### PAY-US-16 — Réévaluer PaymentIntents face à Checkout Sessions custom

**Statut :** ✅ Migration décidée et cadrée ; réalisation obligatoire avant l'extension fonctionnelle

**Priorité :** P1, P0 si Stripe Tax/remises/conversion sont ajoutés

**Dépendances :** `PAY-US-03` à `PAY-US-14`

**En tant que** mainteneur,
**je veux** comparer l'intégration PaymentIntent actuelle à Checkout Sessions `ui_mode: custom`,
**afin de** réduire le code financier spécifique sans perdre les garanties de réservation et d'idempotence.

#### Critères d'acceptation

- **AC-01 — ADR :** `docs/DECISIONS.md` acte Checkout Sessions `ui_mode: custom` comme cible après le lancement carte et décrit les garanties à conserver.
- **AC-02 — Recommandation Stripe :** PaymentIntents sont conservés seulement pour le lancement déjà testé ; Checkout Sessions custom devient le chemin obligatoire avant taxes, remises, B2B, vente hors France ou nouveaux moyens.
- **AC-03 — Méthodes dynamiques :** aucune intégration ne fournit `payment_method_types`; les moyens sont pilotés par Dashboard/Payment Method Configuration et restent compatibles avec la durée de réservation.
- **AC-04 — Migration sûre :** si migration, commandes et paiements existants restent rapprochables, les identifiants Session et PaymentIntent sont persistés et les webhooks coexistent sans double livraison.
- **AC-05 — Mesure :** le nouveau flux est testé en sandbox sur succès, refus, 3DS, moyen asynchrone, expiration, reprise et remboursement avant bascule.
- **AC-06 — Garde-fou :** la configuration de production reste `card_only` et Stripe Tax reste désactivé tant que cette migration et ses prérequis ne sont pas terminés.

---

## 7. Matrice minimale de tests d'acceptation

| Scénario                                   | Résultat attendu                                          |
| ------------------------------------------ | --------------------------------------------------------- |
| Paiement carte nominal                     | Une commande `PAID`, une livraison, un email              |
| 3DS réussi                                 | Paiement confirmé après authentification                  |
| 3DS refusé ou annulé                       | Commande non payée, aucune livraison, reprise possible    |
| Paiement en traitement                     | État `PAYMENT_PROCESSING`, aucune fausse confirmation     |
| Carte refusée                              | Message sûr, panier récupérable, aucun droit              |
| Double clic                                | Un seul `PaymentIntent`, aucun double débit               |
| Deux checkouts concurrents                 | Même paiement pour la même version de commande            |
| Coupure réseau après confirmation          | État récupéré depuis le serveur et le webhook             |
| Succès Stripe sans webhook reçu            | Réconciliation serveur, commande `PAID`, aucun formulaire |
| Paiement déjà `processing` ou `succeeded`  | Aucun `client_secret`, redirection vers le suivi          |
| Réconciliation puis webhook retardé        | Une seule finalisation et une seule livraison             |
| Montant ou devise falsifié                 | Valeur client ignorée/rejetée, total serveur conservé     |
| Achat du dernier exemplaire en concurrence | Un seul acheteur poursuit ; l'autre reçoit `409`          |
| Consultation de la commande d'un tiers     | `404`, aucune fuite d'information                         |
| Webhook sans signature ou payload modifié  | `400`, aucun effet métier                                 |
| Webhook valide envoyé deux fois            | Un seul changement d'état et une seule livraison          |
| Webhooks reçus dans le désordre            | État final correct, aucune régression de `PAID`           |
| Montant Stripe différent du snapshot       | `PAYMENT_REVIEW`, alerte, aucune livraison                |
| Remboursements concurrents                 | Aucun sur-remboursement                                   |
| Rejeu de livraison après crash             | Un droit et un certificat uniques                         |
| Litige ouvert puis gagné                   | Droits suspendus puis restaurés selon la politique        |
| Litige perdu                               | Droits révoqués uniquement sous politique validée         |
| Achat B2B ou adresse hors France           | Refus serveur avant création du PaymentIntent             |
| Paiement France B2C                        | Snapshot HT/TVA/TTC et facture de vente PDF unique        |
| Désactivation d'urgence du checkout        | Nouveaux paiements bloqués, paiements engagés finalisés   |

## 8. Hors périmètre de cet epic

- Stripe Connect et le versement des gains aux artistes ;
- abonnements, paiements récurrents, cryptomonnaies et NFT ;
- stockage manuel de cartes ou création d'un formulaire bancaire maison ;
- stockage des fichiers numériques sources et diffusion CDN, distincts des droits et certificats durables couverts ici ;
- validation juridique/comptable finale du taux, des mentions de facture et du droit de rétractation, qui reste une preuve externe avant le mode live.

## 9. Definition of Done

L'epic est terminé lorsque :

- tous les AC P0 sont implémentés et reliés à une preuve ou à un test ;
- les migrations de données et la stratégie de retour arrière sont revues ;
- les contrats API, variables d'environnement et événements Stripe sont documentés ;
- le parcours complet fonctionne en sandbox sur desktop et mobile ;
- les tests de la section 7 passent ;
- aucune donnée bancaire ou secret n'apparaît dans le frontend, la base, les logs ou les traces ;
- une revue sécurité ne relève aucune vulnérabilité haute ou critique ouverte ;
- les alertes, la rotation des secrets et l'arrêt sûr ont été testés ;
- le Product Owner valide les libellés de consentement, d'erreur, de remboursement et de confirmation.

## 10. Traçabilité avec le besoin initial

| Manque identifié                           | Couverture                                         |
| ------------------------------------------ | -------------------------------------------------- |
| Pas de vrai `POST /orders/checkout`        | `PAY-US-02`, `PAY-US-03`                           |
| Pas de Stripe Elements                     | `PAY-US-04`                                        |
| Pas de webhooks Stripe                     | `PAY-US-05`, `PAY-US-06`                           |
| Pas de confirmation réelle                 | `PAY-US-06`, `PAY-US-07`                           |
| Risque de double débit ou double livraison | `PAY-US-03`, `PAY-US-05`, `PAY-US-06`, `PAY-US-08` |
| Pas de gestion des remboursements          | `PAY-US-09`                                        |
| Sécurité et exploitation incomplètes       | `PAY-US-10`, `PAY-US-11`                           |

## 11. Références officielles Stripe

- [PaymentIntents](https://docs.stripe.com/payments/payment-intents)
- [Accepter un paiement avec Payment Element et PaymentIntents](https://docs.stripe.com/payments/accept-a-payment?api-integration=paymentintents&payment-ui=elements)
- [Payment Element — bonnes pratiques](https://docs.stripe.com/payments/payment-element/best-practices)
- [Webhooks Stripe](https://docs.stripe.com/webhooks)
- [Requêtes idempotentes](https://docs.stripe.com/api/idempotent_requests)
- [Devises et unités mineures](https://docs.stripe.com/currencies)
- [Authentification forte et 3D Secure](https://docs.stripe.com/strong-customer-authentication)
- [Gestion sûre des clés API](https://docs.stripe.com/keys-best-practices)
- [Sécurité et PCI](https://docs.stripe.com/security/guide)
- [Tests Stripe](https://docs.stripe.com/testing)
- [Remboursements](https://docs.stripe.com/refunds)
