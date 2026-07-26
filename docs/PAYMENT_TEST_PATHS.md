# Parcours de test du paiement Stripe

Ce guide teste l'intégration en local et exclusivement dans un sandbox Stripe. Ne jamais saisir une
vraie carte et ne jamais placer de clé `*_live_*` dans `infrastructure/.env`.

## 1. Points d'entrée

| Fonction               | Chemin local                           | Résultat attendu                                            |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Application            | `http://localhost`                     | Page Nuxt, statut backend visible                           |
| Inscription            | `http://localhost/register`            | Création puis email de vérification                         |
| Connexion et code 2FA  | `http://localhost/login`               | Session privée après saisie du code Mailpit                 |
| Panier serveur         | `http://localhost/cart`                | Prix, stock, quantité et empreinte calculés par le serveur  |
| Stripe Payment Element | `http://localhost/checkout`            | Formulaire Stripe hébergé dans l'Element                    |
| Retour de paiement     | `http://localhost/payment/return`      | Lecture du statut serveur, jamais du seul retour navigateur |
| Historique privé       | `http://localhost/orders`              | Uniquement les commandes du compte connecté                 |
| Détail privé           | `http://localhost/orders/{ORDER_UUID}` | Paiement, articles et remboursements sûrs                   |
| Profil                 | `http://localhost/profile`             | Accès vers l'historique privé                               |
| Emails locaux          | `http://localhost:8025`                | Vérification, code de connexion et notifications            |
| Santé API publique     | `http://localhost/api/health`          | `200 OK`                                                    |
| Santé backend directe  | `http://localhost:4000/health`         | `200 OK`                                                    |

Les routes API principales sont :

| Méthode | Route                                                     | Protection                                             |
| ------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `GET`   | `/api/v1/cart`                                            | Session propriétaire                                   |
| `POST`  | `/api/v1/cart/items`                                      | Session, prix et stock serveur                         |
| `POST`  | `/api/v1/cart/validate`                                   | Session, version et empreinte serveur                  |
| `GET`   | `/api/v1/security/csrf-token`                             | Session, réponse `no-store`                            |
| `POST`  | `/api/v1/orders/checkout`                                 | Session, CSRF, rate limit, Idempotency-Key             |
| `POST`  | `/api/v1/orders/{ORDER_UUID}/resume`                      | Propriétaire, CSRF, même PaymentIntent si réutilisable |
| `GET`   | `/api/v1/orders`                                          | Session propriétaire, `private, no-store`              |
| `GET`   | `/api/v1/orders/{ORDER_UUID}`                             | Session propriétaire, sinon `404`                      |
| `GET`   | `/api/v1/orders/{ORDER_UUID}/invoices/{INVOICE_UUID}.pdf` | Facture de vente du propriétaire, sinon `404`          |
| `POST`  | `/api/v1/webhooks/stripe`                                 | Corps brut et signature Stripe, sans cookie ni CSRF    |
| `POST`  | `/api/v1/admin/orders/{ORDER_UUID}/refunds`               | Admin, auth récente, CSRF, rate limit, idempotence     |

## 2. Préparer Stripe sandbox

Dans `infrastructure/.env`, renseigner uniquement les deux clés de test du même sandbox :

```dotenv
STRIPE_SECRET_KEY=sk_test_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PAYMENT_METHOD_CONFIGURATION_ID=pmc_...
PAYMENT_METHODS_POLICY=card_only
PAYMENT_MARKET_COUNTRY=FR
PAYMENT_CUSTOMER_SCOPE=B2C
PAYMENT_MERCHANT_OF_RECORD=MAKE_IT_ART
STRIPE_TAX_ENABLED=false
CHECKOUT_ENABLED=true
```

La Payment Method Configuration sandbox doit présenter uniquement la carte. Le Payment Element masque
également Apple Pay et Google Pay pendant la phase de lancement.

Installer la Stripe CLI, se connecter au sandbox, puis laisser ce terminal ouvert :

```powershell
stripe login
stripe listen --events payment_intent.processing,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,refund.created,refund.updated,refund.failed,charge.dispute.created,charge.dispute.updated,charge.dispute.closed --forward-to http://localhost/api/v1/webhooks/stripe
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
4. Sur `/checkout`, saisir une adresse française, confirmer l'achat en tant que particulier et vérifier
   que les données professionnelles ou un pays hors France sont refusés.
5. Vérifier que le montant du bouton correspond exactement au panier, qu'il est libellé TTC et que
   seule la carte est proposée.
6. Saisir une carte de test Stripe, une date future et n'importe quel CVC à trois chiffres.
7. Après confirmation, vérifier `/payment/return`, `/orders` puis `/orders/{ORDER_UUID}`.
8. Attendre le worker, puis télécharger la facture de vente et vérifier HT, taux, TVA, TTC, identité
   Make It Art, adresse client et numéro `MIA-VTE-AAAA-NNNNNN`.
9. Vérifier dans Stripe Workbench qu'un seul PaymentIntent existe pour cette commande.

## 4. Cartes et résultats à vérifier

| Scénario                        | Carte de test         | Résultat attendu dans Make It Art                              |
| ------------------------------- | --------------------- | -------------------------------------------------------------- |
| Succès nominal                  | `4242 4242 4242 4242` | `PAID`, une seule livraison et confirmation privée             |
| Refus générique                 | `4000 0000 0000 0002` | Aucun droit, panier récupérable, message sans règle antifraude |
| Fonds insuffisants              | `4000 0000 0000 9995` | `PAYMENT_FAILED`, aucune livraison                             |
| Erreur de traitement            | `4000 0000 0000 0119` | Échec sûr et référence support si nécessaire                   |
| 3DS réussi                      | `4000 0000 0000 3220` | Challenge, puis `PAID` après webhook                           |
| 3DS puis refus                  | `4000 0084 0000 1629` | Challenge, puis aucune confirmation de paiement                |
| Remboursement asynchrone réussi | `4000 0000 0000 7726` | `PENDING`, puis `SUCCEEDED` via `refund.updated`               |
| Remboursement asynchrone échoué | `4000 0000 0000 5126` | Échec via `refund.failed`, commande payée non diminuée         |

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

### Webhook de succès manqué puis auto-réparation

Ce scénario reproduit le cas où Stripe a encaissé le paiement alors que Make It Art n'a pas reçu le
webhook de succès :

1. Laisser `stripe listen` actif, ouvrir un checkout et provoquer un refus avec `4000 0000 0000 0002`.
2. Vérifier que la commande est `PAYMENT_FAILED`, puis arrêter temporairement `stripe listen`.
3. Sur le même formulaire, remplacer la carte par `4242 4242 4242 4242` et confirmer le paiement.
4. Revenir sur `/checkout?order={ORDER_UUID}` ou relancer **Vérifier et payer**.
5. Vérifier que le serveur relit le PaymentIntent `succeeded`, passe la commande à `PAID`, retire
   uniquement les articles achetés du panier et n'affiche jamais un nouveau formulaire Stripe.
6. Relancer `stripe listen`, puis renvoyer si besoin l'événement depuis Stripe Workbench. Vérifier que
   ce webhook tardif ne décrémente pas une seconde fois le stock et ne crée pas une seconde livraison.

Sans action utilisateur, le job de rapprochement inspecte aussi les commandes `PENDING_PAYMENT`,
`PAYMENT_PROCESSING` et `PAYMENT_FAILED` âgées de plus de cinq minutes. Il doit produire le même état
final lors de son prochain passage.

### Formulaire Stripe impossible à charger

1. Ouvrir un checkout payable puis bloquer temporairement `js.stripe.com` dans les outils réseau du
   navigateur, ou passer hors ligne avant le chargement du Payment Element.
2. Vérifier que le bouton de paiement reste désactivé.
3. Vérifier que le message demande de ne pas soumettre un nouveau paiement avant contrôle.
4. Cliquer sur **Vérifier le statut de la commande** et confirmer que `/payment/return` n'annonce jamais
   un succès sans état serveur `PAID`.

### Expiration

Un checkout non payé expire après 15 minutes. Après ce délai, exécuter si besoin le job manuellement :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm run payments:expire-checkouts
```

La commande doit passer à `CANCELED`, la réservation doit être libérée et le PaymentIntent annulé s'il
est encore annulable. L'article reste volontairement dans le panier, mais la version du panier avance
pour autoriser un nouveau checkout indépendant. Revenir sur `/cart`, cliquer sur **Vérifier et payer**
et confirmer qu'une nouvelle commande et un nouveau PaymentIntent sont créés sans retomber sur
**Checkout expired**.

## 6. Tester un remboursement admin

1. Payer une commande avec le compte `buyer` et copier son `ORDER_UUID` depuis `/orders`.
2. Se déconnecter, puis se reconnecter avec le compte `admin` créé par le script. L'authentification doit
   dater de moins de dix minutes ; un simple refresh de session ne la rend pas récente.
3. Ouvrir `http://localhost/admin/orders`, repérer la commande avec l'email de l'acheteur, puis cliquer
   sur **Rembourser**.
4. Vérifier que la fenêtre affiche le total payé, le total déjà remboursé et le solde disponible.
5. Choisir **Montant partiel**, saisir `5,00`, choisir le motif **Demande du client**, cocher la
   confirmation, puis cliquer sur **Rembourser 5,00 €**.
6. Vérifier que le bouton reste désactivé avant la confirmation et pendant l'envoi. Un double clic ne
   doit pas créer un second remboursement.
7. La demande acceptée doit apparaître dans l'historique avec le statut `PENDING`. Après réception des
   webhooks Stripe, rafraîchir la liste : le remboursement doit devenir `SUCCEEDED`, la commande
   `PARTIALLY_REFUNDED` et le solde disponible doit diminuer exactement de `5,00 €`.
8. Ouvrir de nouveau la commande, choisir **Tout le solde**, confirmer puis rembourser. Après les
   webhooks, la commande doit devenir `REFUNDED` et le solde disponible `0,00 €`.
9. Se reconnecter comme acheteur et ouvrir `/orders/{ORDER_UUID}` : les deux remboursements doivent
   afficher leur montant, leur devise, leur statut et leur référence bancaire lorsqu'elle est disponible.

Contrôles négatifs à effectuer dans l'interface :

- le montant vide, nul, négatif ou comportant plus de deux décimales ne peut pas être envoyé ;
- un montant égal au solde doit passer par **Tout le solde** ;
- un montant supérieur au solde est refusé ;
- une commande en attente, annulée ou entièrement remboursée n'affiche pas d'action de remboursement ;
- l'historique reste consultable après un remboursement total ;
- une authentification vieille de plus de dix minutes produit un message demandant une reconnexion ;
- aucune référence Stripe interne ou clé d'idempotence n'est affichée.

### Contrôle avancé de l'idempotence de l'API

L'interface génère et conserve automatiquement une clé d'idempotence sûre pour chaque demande. Pour
vérifier explicitement le rejeu et le conflit de payload, ouvrir les outils de développement du navigateur
sur `http://localhost`, onglet **Console**, adapter l'UUID et exécuter :

```javascript
const orderId = "ORDER_UUID";
const idempotencyKey = crypto.randomUUID();
const csrf = await fetch("/api/v1/security/csrf-token", {
  credentials: "include"
}).then((response) => response.json());

async function requestRefund(amount) {
  const response = await fetch(`/api/v1/admin/orders/${orderId}/refunds`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf.csrfToken,
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({ amount, reason: "CUSTOMER_REQUEST" })
  });

  return { status: response.status, body: await response.json() };
}

console.log(await requestRefund(500));
console.log(await requestRefund(500));
console.log(await requestRefund(600));
```

La première réponse attendue est `202` avec un remboursement `PENDING`, la deuxième `200` avec le même
remboursement, et la troisième `409` parce que la même clé a été réutilisée avec un montant différent.

À vérifier également :

- `amount: 0`, un décimal ou un montant supérieur au solde est rejeté.
- Ajouter `providerPaymentId` au JSON est rejeté : l'identifiant Stripe vient toujours de la base.
- Un remboursement partiel donne `PARTIALLY_REFUNDED`.
- Le remboursement du solde donne `REFUNDED` et programme `REVOKE_DOWNLOAD_RIGHTS`.
- Avec la carte `4000 0000 0000 5126`, l'échec final conserve le montant payé et affiche l'échec.

## 7. Tester la facture et la politique France B2C

1. Relancer deux fois la tâche `ISSUE_SALE_INVOICE` d'une même commande payée.
2. Vérifier qu'une seule ligne `invoice` et un seul numéro de facture existent.
3. Télécharger le PDF avec l'acheteur : réponse `200`, `Content-Type: application/pdf`.
4. Tenter le même URL avec un autre compte : réponse `404`.
5. Vérifier que la facture provient des snapshots de commande et ne change pas si le profil ou le prix
   courant de l'œuvre est modifié.
6. Vérifier que `COMMISSION_INVOICING_ENABLED=false` ne crée aucune facture artiste en phase 1.
7. Vérifier qu'un checkout `B2B`, une clé `companyName`, une attestation consommateur absente ou une
   adresse hors France échoue avant toute création de PaymentIntent.

## 8. Tester les protections

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

## 9. Chemins automatisés

```powershell
npm run ci
npm run payments:validate-sandbox
npm run security:audit
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm test
npm run payments:reconcile
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Résultats attendus : suites backend et frontend vertes, build Nuxt valide et aucune vulnérabilité haute
ou critique. Les cas automatisés couvrent notamment signatures, payload
modifié, rejeu, ordre inversé, concurrence, montant/devise falsifiés, double checkout, finalisation unique,
remboursements, snapshots France B2C, TVA incluse, facture PDF idempotente, livraison numérique,
litiges et révocation des droits.

`payments:reconcile` est un diagnostic en lecture seule par défaut. Il relit Stripe, compare mode,
identifiant, montant, devise, commande et statuts, puis retourne uniquement des références et codes
techniques. Après revue de cette sortie, `npm run payments:reconcile -- --apply` applique le même
processeur idempotent que les webhooks. En production, l'application manuelle exige en plus
`--confirm=STRIPE_IS_SOURCE_OF_TRUTH`.

Le test réel du canal d'alerte se lance volontairement avec une confirmation explicite :

```powershell
npm run payments:test-alert -- --send
```

La réception du message doit être conservée comme preuve datée ; l'acceptation SMTP ne prouve pas à
elle seule que le canal d'astreinte a vu l'alerte.

## 10. Fin de validation

Avant tout mode live, compléter `docs/PAYMENT_GO_LIVE_CHECKLIST.md`. Garder
`CHECKOUT_ENABLED=false` tant que les preuves HTTPS, clés live, secret live, dix événements webhook,
Payment Method Configuration carte, identité/taux de facturation, CSP, alertes et rotation ne sont pas
toutes collectées.
