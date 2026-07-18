# Parcours de test du paiement Stripe

Ce guide teste l'intégration en local et exclusivement dans un sandbox Stripe. Ne jamais saisir une
vraie carte et ne jamais placer de clé `*_live_*` dans `infrastructure/.env`.

## 1. Points d'entrée

| Fonction | Chemin local | Résultat attendu |
| --- | --- | --- |
| Application | `http://localhost` | Page Nuxt, statut backend visible |
| Inscription | `http://localhost/register` | Création puis email de vérification |
| Connexion et code 2FA | `http://localhost/login` | Session privée après saisie du code Mailpit |
| Panier serveur | `http://localhost/cart` | Prix, stock, quantité et empreinte calculés par le serveur |
| Stripe Payment Element | `http://localhost/checkout` | Formulaire Stripe hébergé dans l'Element |
| Retour de paiement | `http://localhost/payment/return` | Lecture du statut serveur, jamais du seul retour navigateur |
| Historique privé | `http://localhost/orders` | Uniquement les commandes du compte connecté |
| Détail privé | `http://localhost/orders/{ORDER_UUID}` | Paiement, articles et remboursements sûrs |
| Profil | `http://localhost/profile` | Accès vers l'historique privé |
| Emails locaux | `http://localhost:8025` | Vérification, code de connexion et notifications |
| Santé API publique | `http://localhost/api/health` | `200 OK` |
| Santé backend directe | `http://localhost:4000/health` | `200 OK` |

Les routes API principales sont :

| Méthode | Route | Protection |
| --- | --- | --- |
| `GET` | `/api/v1/cart` | Session propriétaire |
| `POST` | `/api/v1/cart/items` | Session, prix et stock serveur |
| `POST` | `/api/v1/cart/validate` | Session, version et empreinte serveur |
| `GET` | `/api/v1/security/csrf-token` | Session, réponse `no-store` |
| `POST` | `/api/v1/orders/checkout` | Session, CSRF, rate limit, Idempotency-Key |
| `POST` | `/api/v1/orders/{ORDER_UUID}/resume` | Propriétaire, CSRF, même PaymentIntent si réutilisable |
| `GET` | `/api/v1/orders` | Session propriétaire, `private, no-store` |
| `GET` | `/api/v1/orders/{ORDER_UUID}` | Session propriétaire, sinon `404` |
| `POST` | `/api/v1/webhooks/stripe` | Corps brut et signature Stripe, sans cookie ni CSRF |
| `POST` | `/api/v1/admin/orders/{ORDER_UUID}/refunds` | Admin, auth récente, CSRF, rate limit, idempotence |

## 2. Préparer Stripe sandbox

Dans `infrastructure/.env`, renseigner uniquement les deux clés de test du même sandbox :

```dotenv
STRIPE_SECRET_KEY=sk_test_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
CHECKOUT_ENABLED=true
```

Installer la Stripe CLI, se connecter au sandbox, puis laisser ce terminal ouvert :

```powershell
stripe login
stripe listen --events payment_intent.processing,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,refund.created,refund.updated,refund.failed --forward-to http://localhost/api/v1/webhooks/stripe
```

Copier le `whsec_...` affiché par `stripe listen` dans `STRIPE_WEBHOOK_SECRET`, puis reconstruire ou
recréer les services pour injecter la configuration :

```powershell
npm run dev:up:build
```

La Stripe CLI doit rester ouverte pendant les paiements et remboursements. Le secret retourné par la
CLI est celui qui signe les événements transférés localement.

## 3. Créer un parcours prêt à payer

Le script ci-dessous refuse la production et toute clé Stripe live. Il crée un acheteur vérifié, un
administrateur vérifié, une œuvre disponible et un panier déjà rempli :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm run payments:seed-test
```

Conserver la sortie JSON : elle contient les deux emails temporaires, leur mot de passe, l'identifiant
de l'œuvre et le montant. Une nouvelle exécution crée un parcours indépendant, utile pour chaque carte
ou scénario.

1. Ouvrir `/login` et utiliser le compte `buyer` affiché.
2. Lire le code de connexion dans Mailpit sur `/8025` et le saisir dans l'application.
3. Ouvrir `/cart`, vérifier l'œuvre à 19,90 EUR et cliquer sur **Vérifier et payer**.
4. Sur `/checkout`, vérifier que le montant du bouton correspond exactement au panier.
5. Saisir une carte de test Stripe, une date future et n'importe quel CVC à trois chiffres.
6. Après confirmation, vérifier `/payment/return`, `/orders` puis `/orders/{ORDER_UUID}`.
7. Vérifier dans Stripe Workbench qu'un seul PaymentIntent existe pour cette commande.

## 4. Cartes et résultats à vérifier

| Scénario | Carte de test | Résultat attendu dans Make It Art |
| --- | --- | --- |
| Succès nominal | `4242 4242 4242 4242` | `PAID`, une seule livraison et confirmation privée |
| Refus générique | `4000 0000 0000 0002` | Aucun droit, panier récupérable, message sans règle antifraude |
| Fonds insuffisants | `4000 0000 0000 9995` | `PAYMENT_FAILED`, aucune livraison |
| Erreur de traitement | `4000 0000 0000 0119` | Échec sûr et référence support si nécessaire |
| 3DS réussi | `4000 0000 0000 3220` | Challenge, puis `PAID` après webhook |
| 3DS puis refus | `4000 0084 0000 1629` | Challenge, puis aucune confirmation de paiement |
| Remboursement asynchrone réussi | `4000 0000 0000 7726` | `PENDING`, puis `SUCCEEDED` via `refund.updated` |
| Remboursement asynchrone échoué | `4000 0000 0000 5126` | Échec via `refund.failed`, commande payée non diminuée |

Ces numéros viennent de la documentation officielle Stripe et ne déplacent aucun argent en sandbox.

## 5. Reprise, concurrence et réseau

### Même paiement après rechargement

1. Arriver sur `/checkout` sans confirmer.
2. Copier l'UUID de commande affiché.
3. Recharger `/checkout?order={ORDER_UUID}`.
4. Vérifier dans Stripe Workbench que le même PaymentIntent est réutilisé.

### Panier modifié

1. Initialiser un checkout, sans payer.
2. Revenir sur `/cart`, modifier la quantité, puis revalider.
3. Retourner sur `/checkout`.
4. Vérifier que l'ancien PaymentIntent est annulé lorsqu'il est annulable et qu'un nouveau consentement
   est demandé pour le nouveau montant.

### Double clic

Cliquer rapidement deux fois sur le bouton de paiement ou recharger pendant l'initialisation. Le bouton
doit se désactiver et Stripe Workbench doit montrer un seul PaymentIntent pour la version du panier.

### Perte réseau

Dans les outils réseau du navigateur, passer temporairement en mode **Offline** juste après la
confirmation, puis revenir en ligne et ouvrir `/payment/return` ou `/orders/{ORDER_UUID}`. Le statut doit
être récupéré depuis le serveur et le webhook, sans nouvelle tentative de débit automatique.

### Expiration

Un checkout non payé expire après 15 minutes. Après ce délai, exécuter si besoin le job manuellement :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm run payments:expire-checkouts
```

La commande doit passer à `CANCELED`, la réservation doit être libérée et le PaymentIntent annulé s'il
est encore annulable.

## 6. Tester un remboursement admin

1. Payer une commande avec le compte `buyer` et copier son `ORDER_UUID` depuis `/orders`.
2. Se déconnecter, puis se reconnecter avec le compte `admin` créé par le script. L'authentification doit
   dater de moins de dix minutes ; un simple refresh de session ne la rend pas récente.
3. Ouvrir les outils de développement du navigateur sur `http://localhost`, onglet **Console**.
4. Adapter l'UUID et le montant en centimes, puis exécuter :

```javascript
const orderId = "ORDER_UUID";
const csrf = await fetch("/api/v1/security/csrf-token", {
  credentials: "include"
}).then((response) => response.json());

const refundResponse = await fetch(`/api/v1/admin/orders/${orderId}/refunds`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrf.csrfToken,
    "Idempotency-Key": crypto.randomUUID()
  },
  body: JSON.stringify({ amount: 500, reason: "CUSTOMER_REQUEST" })
});

console.log(refundResponse.status, await refundResponse.json());
```

La réponse initiale attendue est `202` avec un remboursement `PENDING`. Se reconnecter ensuite comme
acheteur et ouvrir `/orders/{ORDER_UUID}` : le remboursement doit afficher montant, devise, statut et
référence bancaire lorsqu'elle devient disponible.

À vérifier également :

- Réutiliser exactement la même `Idempotency-Key` et le même corps retourne le même remboursement.
- Réutiliser cette clé avec un autre montant retourne `409`.
- `amount: 0`, un décimal ou un montant supérieur au solde est rejeté.
- Ajouter `providerPaymentId` au JSON est rejeté : l'identifiant Stripe vient toujours de la base.
- Un remboursement partiel donne `PARTIALLY_REFUNDED`.
- Le remboursement du solde donne `REFUNDED` et programme `REVOKE_DOWNLOAD_RIGHTS`.
- Avec la carte `4000 0000 0000 5126`, l'échec final conserve le montant payé et affiche l'échec.

## 7. Tester les protections

### Propriété des commandes

Créer deux fixtures, payer avec le premier acheteur puis tenter d'ouvrir son UUID avec le deuxième.
`/orders/{ORDER_UUID}` doit répondre `404`, sans révéler si la commande existe.

### Signature webhook invalide

```powershell
curl.exe -i -X POST http://localhost/api/v1/webhooks/stripe `
  -H "Content-Type: application/json" `
  -H "Stripe-Signature: t=1,v1=invalid" `
  --data-binary '{"id":"evt_fake","type":"payment_intent.succeeded"}'
```

Résultat attendu : `400`, aucune commande, aucun paiement et aucun droit modifiés.

### Coupe-circuit

1. Laisser un paiement déjà initialisé.
2. Définir `CHECKOUT_ENABLED=false` dans `infrastructure/.env` et recréer le backend.
3. Un nouveau `/checkout` doit recevoir `503`.
4. Confirmer ou simuler le webhook du paiement déjà engagé : il doit encore être finalisé.
5. Remettre `CHECKOUT_ENABLED=true` après le test.

### Données sensibles

Pendant tous les scénarios, inspecter la console, les réponses réseau et les logs. Ils ne doivent jamais
contenir clé secrète, secret webhook, `client_secret` hors réponse de checkout authentifiée, numéro de
carte, CVC, cookie ou corps Stripe complet.

## 8. Chemins automatisés

```powershell
npm run ci
npm run payments:validate-sandbox
npm run security:audit
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm test
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Résultats attendus : suites backend et frontend vertes, build Nuxt valide et aucune vulnérabilité haute
ou critique. Les cas automatisés couvrent notamment signatures, payload
modifié, rejeu, ordre inversé, concurrence, montant/devise falsifiés, double checkout, finalisation unique,
remboursements et révocation des droits.

## 9. Fin de validation

Avant tout mode live, compléter `docs/PAYMENT_GO_LIVE_CHECKLIST.md`. Garder
`CHECKOUT_ENABLED=false` tant que les preuves HTTPS, clés live, secret live, sept événements webhook,
wallets, CSP, alertes et rotation ne sont pas toutes collectées.
