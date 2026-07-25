# Guide QA Stripe pas à pas

Ce document explique comment tester l'intégration Stripe de Make It Art en développement. Il est
destiné à être suivi par une personne qui ne connaît pas encore l'implémentation.

Le plan exhaustif reste disponible dans
[`PAYMENT_TEST_PATHS.md`](./PAYMENT_TEST_PATHS.md). Ce guide donne l'ordre concret dans lequel
effectuer les vérifications.

## 1. Ce que cette campagne doit démontrer

À la fin des tests, nous devons avoir vérifié que :

- le montant et la devise sont calculés par le serveur ;
- une commande n'est jamais considérée comme payée à partir du seul retour du navigateur ;
- une œuvre n'est livrée qu'après confirmation du paiement par Stripe ;
- un rejeu, un double clic ou un webhook dupliqué ne crée pas deux paiements ou deux livraisons ;
- les refus de carte et les erreurs 3DS ne donnent aucun droit d'accès ;
- un remboursement ou un litige modifie correctement les droits sur l'œuvre ;
- un utilisateur ne peut pas consulter les commandes et les factures d'un autre utilisateur ;
- le lancement reste limité à la France, aux particuliers et à la carte ;
- Stripe Tax, Stripe Connect, les professionnels et les moyens de paiement différés restent hors
  périmètre.

Cette campagne utilise exclusivement le sandbox Stripe. Ne jamais saisir une vraie carte ou une clé
Stripe live.

## 2. Avant de commencer

Préparer trois terminaux :

| Terminal   | Utilisation                                                 |
| ---------- | ----------------------------------------------------------- |
| Terminal A | Docker, fixtures et commandes de validation                 |
| Terminal B | Listener Stripe CLI, à laisser ouvert pendant les paiements |
| Terminal C | Logs du backend, y compris les jobs de paiement             |

Préparer également :

- le Dashboard Stripe dans le bon sandbox ;
- un navigateur avec les outils de développement ouverts ;
- Mailpit sur `http://localhost:8025` ;
- un fichier de notes pour conserver les identifiants et les résultats, sans aucun secret.

Pour chaque scénario, noter au minimum :

- la date et le nom du testeur ;
- le commit et la branche testés ;
- l'email de la fixture ;
- l'UUID de commande ;
- les références `pi_...`, `evt_...`, `re_...` ou `du_...` utiles ;
- le résultat attendu et le résultat observé ;
- les captures d'écran pertinentes.

Ne jamais enregistrer dans les preuves :

- une clé `sk_...` ou `rk_...` ;
- un secret `whsec_...` ;
- un cookie, un JWT ou un `client_secret` ;
- un CVC ou un numéro de carte réel ;
- le corps complet d'un webhook Stripe.

## 3. Étape 1 — Vérifier la configuration locale

Ouvrir `infrastructure/.env` et confirmer que les valeurs appartiennent toutes au même sandbox. Une
clé restreinte `rk_test_...` avec les permissions minimales est recommandée ; une clé `sk_test_...`
reste acceptée pour le développement si la clé restreinte n'est pas encore prête.

```dotenv
STRIPE_SECRET_KEY=rk_test_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENT_METHOD_CONFIGURATION_ID=pmc_1Tx4BG0RMeoK9ImF5dnUqEPm

PAYMENT_METHODS_POLICY=card_only
PAYMENT_MARKET_COUNTRY=FR
PAYMENT_CUSTOMER_SCOPE=B2C
PAYMENT_MERCHANT_OF_RECORD=MAKE_IT_ART
STRIPE_TAX_ENABLED=false
CHECKOUT_ENABLED=true
DISPUTE_RIGHTS_POLICY=SUSPEND_ON_OPEN
DISPUTE_RIGHTS_POLICY_CONFIRMED=true
```

Dans le Dashboard Stripe, vérifier que la Payment Method Configuration :

- est celle du compte plateforme Make It Art ;
- autorise les cartes ;
- n'affiche pas Link, Apple Pay, Google Pay ou un moyen asynchrone dans le parcours de lancement.

Lancer ensuite :

```powershell
npm run payments:validate-sandbox
npm run payments:scan-secrets
```

Résultat attendu : les deux commandes terminent avec le code `0`, sans clé live ni secret committé.

## 4. Étape 2 — Démarrer l'application

Depuis la racine du projet, dans le terminal A :

```powershell
npm run dev:up:build
```

Vérifier les conteneurs :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml ps
```

Les services `db`, `redis`, `mailpit`, `backend`, `frontend` et `nginx` doivent être démarrés. Les
services avec un healthcheck doivent être `healthy`.

Vérifier ensuite :

- `http://localhost` affiche l'application ;
- `http://localhost/api/health` répond avec un statut HTTP `200` ;
- `http://localhost:4000/health` répond avec un statut HTTP `200` ;
- `http://localhost:8025` affiche Mailpit.

## 5. Étape 3 — Démarrer les webhooks Stripe locaux

Dans le terminal B :

```powershell
stripe login
stripe listen --events payment_intent.processing,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,refund.created,refund.updated,refund.failed,charge.dispute.created,charge.dispute.updated,charge.dispute.closed --forward-to http://localhost/api/v1/webhooks/stripe
```

Stripe CLI affiche un nouveau secret `whsec_...`.

1. Copier ce secret dans `STRIPE_WEBHOOK_SECRET` dans `infrastructure/.env`.
2. Ne jamais copier ce secret dans un document ou un message d'équipe.
3. Recréer le backend pour injecter la nouvelle valeur :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up -d --force-recreate backend
```

4. Laisser le terminal B ouvert.

Dans le terminal C, suivre les logs :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml logs -f backend
```

Pendant un paiement, Stripe CLI doit afficher des événements transférés avec une réponse HTTP `200`.
Une réponse `400 INVALID_STRIPE_SIGNATURE` indique généralement que le backend n'utilise pas le
dernier `whsec_...`.

## 6. Étape 4 — Exécuter les contrôles automatiques

Avant les tests manuels :

```powershell
npm run quality
npm run ci
npm --prefix frontend run typecheck
npm --prefix frontend run build
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm test
```

Résultat attendu :

- lint et format valides ;
- 208 tests backend réussis ;
- 38 tests frontend réussis ;
- typecheck Nuxt réussi ;
- build Nuxt de production réussi ;
- aucun test PostgreSQL ignoré.

L'audit de dépendances nécessite un accès au registre npm :

```powershell
npm run security:audit
```

Si l'audit ne peut pas être exécuté pour une raison réseau, le noter comme `NON EXÉCUTÉ`. Ne pas le
présenter comme réussi.

Arrêter la campagne si un contrôle critique échoue.

## 7. Étape 5 — Créer une fixture indépendante

Créer une nouvelle fixture avant chaque scénario qui modifie un paiement, un remboursement ou un
litige :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm run payments:seed-test
```

Conserver temporairement la sortie JSON. Elle contient :

- un acheteur vérifié ;
- un administrateur vérifié ;
- leur mot de passe de test ;
- une œuvre disponible ;
- un panier déjà rempli ;
- le prix attendu.

Important :

- se connecter avec l'email `buyer` exactement affiché par la fixture ;
- ne pas créer un autre compte depuis `/register` ;
- ouvrir `http://localhost/cart` ;
- `/shopping-basket` est uniquement un ancien alias qui redirige vers `/cart`.

Si `/cart` est vide, vérifier en premier que l'utilisateur connecté est bien le `buyer` de la dernière
fixture.

## 8. Étape 6 — Se connecter avec l'acheteur

1. Ouvrir `http://localhost/login`.
2. Saisir l'email `buyer` et le mot de passe fournis par la fixture.
3. Si un code de connexion est demandé, ouvrir Mailpit sur `http://localhost:8025`.
4. Ouvrir le dernier email destiné à cet acheteur.
5. Saisir le code dans l'application.
6. Ouvrir `http://localhost/cart`.

Résultat attendu :

- l'œuvre de la fixture est affichée ;
- le prix est `19,90 € TTC` pour la fixture standard ;
- le panier ne contient aucune œuvre appartenant à un autre utilisateur ;
- le bouton **Vérifier et payer** est disponible.

## 9. Étape 7 — Tester un paiement nominal

Depuis `/cart` :

1. Cliquer sur **Vérifier et payer**.
2. Vérifier l'arrivée sur `/checkout`.
3. Saisir une adresse française fictive.
4. Confirmer que l'achat est effectué en tant que particulier.
5. Vérifier que le pays hors France et les données professionnelles sont refusés.
6. Vérifier que seule la carte est proposée.
7. Saisir la carte Stripe suivante :

```text
Numéro : 4242 4242 4242 4242
Expiration : 12/34
CVC : 123
Nom : Test QA
```

8. Confirmer une seule fois.
9. Attendre la page `/payment/return`.
10. Ouvrir `/orders`, puis le détail de la commande.

Résultat attendu dans l'application :

- le retour navigateur ne déclare pas le paiement réussi avant confirmation serveur ;
- la commande termine en `PAID` ;
- le paiement termine en `SUCCEEDED` ;
- le panier ne contient plus l'œuvre achetée ;
- le droit de téléchargement et le certificat sont `ACTIVE` ;
- une seule facture de vente est disponible ;
- la facture contient HT, TVA et TTC avec `HT + TVA = TTC` ;
- aucune facture de commission artiste n'est créée en phase 1.

Résultat attendu dans Stripe :

- un seul PaymentIntent pour la commande ;
- le montant est `1990` centimes et la devise est `EUR` pour la fixture standard ;
- le PaymentIntent et la charge appartiennent au sandbox attendu ;
- la Payment Method Configuration attendue est utilisée.

Résultat attendu dans Stripe CLI et les logs :

- `payment_intent.succeeded` reçoit un HTTP `200` ;
- aucun secret, CVC ou numéro de carte n'apparaît dans les logs ;
- les tâches de facture, email, droits et certificat ne sont exécutées qu'une fois.

## 10. Étape 8 — Tester un refus puis une nouvelle tentative

Créer une nouvelle fixture et reprendre les étapes de connexion.

Première tentative :

```text
Numéro : 4000 0000 0000 0002
Expiration : 12/34
CVC : 123
```

Résultat attendu :

- le paiement est refusé avec un message compréhensible et non sensible ;
- la commande n'est pas `PAID` ;
- aucun droit, certificat, email de livraison ou facture n'est créé ;
- l'œuvre reste récupérable pour une nouvelle tentative.

Sur la même commande, effectuer ensuite une nouvelle tentative avec :

```text
Numéro : 4000 0000 0000 3220
Expiration : 12/34
CVC : 123
```

Terminer le challenge 3D Secure.

Résultat attendu :

- le même PaymentIntent réutilisable est conservé ;
- une nouvelle charge Stripe peut légitimement remplacer la charge refusée ;
- la commande termine en `PAID / SUCCEEDED` ;
- aucune alerte `PAYMENT_CHARGE_ID_MISMATCH` n'est créée ;
- la livraison n'est exécutée qu'après le succès.

## 11. Étape 9 — Tester un paiement sans webhook

Ce scénario vérifie que le navigateur ne constitue jamais la source de vérité.

1. Créer une nouvelle fixture et ouvrir le checkout.
2. Arrêter temporairement le listener Stripe CLI avec `Ctrl+C`.
3. Payer avec `4242 4242 4242 4242`.
4. Observer la page de retour.

Résultat attendu avant rapprochement :

- Stripe indique que le PaymentIntent a réussi ;
- Make It Art reste dans un état d'attente tant que le succès n'est pas confirmé localement ;
- l'interface n'affiche jamais un faux message de succès ;
- aucun droit ou certificat n'est accordé trop tôt.

Relancer ensuite `stripe listen` avec les mêmes événements, injecter son nouveau `whsec_...` et recréer
le backend comme à l'étape 3.

Effectuer d'abord un diagnostic sans mutation :

```powershell
npm run payments:reconcile
```

Après lecture du diagnostic, appliquer le rapprochement :

```powershell
npm run payments:reconcile -- --apply
```

Résultat attendu :

- la commande converge vers `PAID / SUCCEEDED` ;
- les tâches de livraison sont créées une seule fois ;
- le rejeu tardif du webhook reste idempotent ;
- aucun second débit n'est créé.

## 12. Étape 10 — Tester un remboursement

Le parcours détaillé, l'interface admin et le contrôle avancé de l'idempotence sont décrits dans la section
**Tester un remboursement admin** de
[`PAYMENT_TEST_PATHS.md`](./PAYMENT_TEST_PATHS.md#6-tester-un-remboursement-admin).

Ordre à respecter :

1. Créer une nouvelle fixture.
2. Payer la commande avec l'acheteur.
3. Copier son `ORDER_UUID`.
4. Se déconnecter.
5. Se reconnecter avec l'administrateur de la même fixture.
6. Ouvrir `/admin/orders`, repérer la commande et cliquer sur **Rembourser**.
7. Vérifier les trois montants affichés, choisir **Montant partiel**, saisir `5,00`, sélectionner le motif
   et confirmer explicitement l'action.
8. Vérifier l'état `PENDING`, puis `SUCCEEDED` après les webhooks, ainsi que la commande
   `PARTIALLY_REFUNDED`.
9. Exécuter le contrôle avancé documenté pour rejouer exactement une même requête : le même
   remboursement doit être retourné.
10. Réutiliser la clé avec un montant différent : la réponse doit être `409`.
11. Depuis l'interface, rembourser tout le solde restant.
12. Revenir avec l'acheteur et vérifier `REFUNDED`.

Après remboursement total :

- le montant remboursé total est exactement égal au montant payé ;
- les droits et le certificat sont `REVOKED` ;
- aucune seconde facture de vente n'est créée ;
- les deux remboursements restent visibles sur la commande.

Utiliser une nouvelle commande pour tester les cartes de remboursement asynchrone :

| Cas                             | Carte                 |
| ------------------------------- | --------------------- |
| Remboursement asynchrone réussi | `4000 0000 0000 7726` |
| Remboursement asynchrone échoué | `4000 0000 0000 5126` |

## 13. Étape 11 — Tester un litige

Créer une nouvelle fixture et payer avec :

```text
Numéro : 4000 0000 0000 0259
Expiration : 12/34
CVC : 123
```

Cette carte de test provoque un litige pour fraude.

À l'ouverture du litige :

- Stripe CLI reçoit `charge.dispute.created` avec un HTTP `200` ;
- le litige est visible dans `/admin/payments` ;
- les droits et le certificat passent immédiatement à `SUSPENDED` ;
- l'acheteur ne peut plus utiliser l'accès à l'œuvre.

Depuis le Dashboard Stripe sandbox, soumettre ensuite la preuve de test gagnante.

Après `charge.dispute.updated` et `charge.dispute.closed` :

- le litige termine en `WON` ;
- les droits et le certificat reviennent à `ACTIVE` ;
- les tâches de suspension et de restauration ne sont pas dupliquées.

Le scénario de litige perdu doit être effectué sur une autre commande. Le résultat attendu est une
révocation définitive des droits.

## 14. Étape 12 — Tester l'expiration et le coupe-circuit

### Expiration

1. Créer une nouvelle fixture.
2. Initialiser un checkout sans payer.
3. Attendre son expiration ou exécuter :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm run payments:expire-checkouts
```

Résultat attendu :

- la commande passe à `CANCELED` ;
- le PaymentIntent est annulé lorsqu'il est encore annulable ;
- la réservation de stock est libérée ;
- un second passage du job ne produit aucun nouvel effet.

### Coupe-circuit

1. Initialiser un paiement sans le confirmer.
2. Passer `CHECKOUT_ENABLED=false` dans `infrastructure/.env`.
3. Recréer le backend.
4. Tenter d'initialiser un nouveau checkout.

Résultat attendu :

- le nouveau checkout reçoit un HTTP `503` ;
- les webhooks, le rapprochement et la finalisation d'un paiement déjà engagé continuent de
  fonctionner.

Remettre obligatoirement `CHECKOUT_ENABLED=true` et recréer le backend après le test.

## 15. Étape 13 — Tester les protections d'accès

1. Créer deux fixtures distinctes : acheteur A et acheteur B.
2. Payer une commande avec A.
3. Copier l'UUID et l'URL de facture de A.
4. Se déconnecter puis se connecter avec B.
5. Essayer d'ouvrir la commande et la facture de A.

Résultat attendu :

- la commande de A retourne `404` pour B ;
- la facture de A retourne `404` pour B ;
- aucune information ne révèle si la commande existe ;
- `/orders` de B ne contient aucune commande de A.

Vérifier également la signature webhook invalide :

```powershell
curl.exe -i -X POST http://localhost/api/v1/webhooks/stripe `
  -H "Content-Type: application/json" `
  -H "Stripe-Signature: t=1,v1=invalid" `
  --data-binary '{"id":"evt_fake","type":"payment_intent.succeeded"}'
```

Résultat attendu : HTTP `400` et aucune modification d'une commande, d'un paiement ou d'un droit.

## 16. Étape 14 — Tester les navigateurs et l'accessibilité

Effectuer au minimum le paiement nominal, le refus et le 3DS sur :

- Chrome Windows ;
- Edge Windows ;
- Firefox Windows ;
- Safari macOS ou iOS ;
- Chrome Android.

Pour chaque navigateur :

- tester une taille desktop et une taille mobile ;
- vérifier le zoom à `200 %` ;
- effectuer le parcours au clavier ;
- vérifier le focus visible et la lecture des erreurs ;
- tester le rechargement de `/checkout` ;
- tester un double clic sur le bouton de confirmation ;
- vérifier qu'aucun contenu du Payment Element ne déborde ;
- vérifier que le bouton reste désactivé tant que Stripe n'est pas chargé.

## 17. Ordre conseillé pour une campagne complète

Suivre cet ordre sans mélanger les commandes :

- [ ] Configuration sandbox
- [ ] Services Docker et healthchecks
- [ ] Listener Stripe et secret webhook injecté
- [ ] Contrôles automatiques
- [ ] Paiement nominal
- [ ] Refus puis retry 3DS
- [ ] Paiement sans webhook et rapprochement
- [ ] Remboursement partiel, rejeu et remboursement total
- [ ] Litige ouvert, gagné et perdu
- [ ] Expiration
- [ ] Coupe-circuit
- [ ] Cloisonnement entre deux acheteurs
- [ ] Navigateurs, mobile et accessibilité
- [ ] Rapport final

Toujours créer une nouvelle fixture pour chaque ligne financière importante.

## 18. Que faire lorsqu'un test échoue

Classer le défaut :

| Niveau | Signification                                                                      | Action                                                     |
| ------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P0     | Perte financière, double débit/livraison, accès indu, secret exposé                | Arrêt immédiat et `NO-GO`                                  |
| P1     | Fonction essentielle incorrecte : remboursement, litige, facture, stock ou webhook | `NO-GO` jusqu'à correction                                 |
| P2     | Dégradation avec contournement sûr                                                 | Corriger avant production ou obtenir une dérogation écrite |
| P3     | Défaut cosmétique                                                                  | Peut être planifié ultérieurement                          |

Pour chaque défaut :

1. conserver l'UUID de commande et les références Stripe utiles ;
2. noter les étapes exactes de reproduction ;
3. capturer le résultat attendu et observé ;
4. expurger tous les secrets ;
5. corriger le problème ;
6. rejouer le cas en échec ;
7. rejouer la famille fonctionnelle concernée ;
8. rejouer le paiement nominal.

## 19. Critères de fin

La campagne de développement est `PASS` uniquement si :

- tous les cas critiques exécutés sont conformes ;
- aucun P0 ou P1 n'est ouvert ;
- les contrôles automatiques sont verts ;
- les scénarios non exécutés sont explicitement listés ;
- les preuves sont datées et partageables sans secret.

Un `PASS` en développement n'autorise pas à lui seul la production. Avant le mode live, compléter
[`PAYMENT_GO_LIVE_CHECKLIST.md`](./PAYMENT_GO_LIVE_CHECKLIST.md), exécuter le validateur go-live et
obtenir les validations fiscales, comptables, produit et exploitation.

## 20. Dépannage rapide

### Le panier est vide après création d'une fixture

- vérifier que le compte connecté est le `buyer` de la dernière fixture ;
- ne pas créer un nouvel utilisateur manuellement ;
- ouvrir `/cart` ;
- se déconnecter et se reconnecter si une ancienne session est encore active.

### Le backend n'utilise pas le nouveau `whsec_...`

Après modification de `infrastructure/.env`, exécuter :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up -d --force-recreate backend
```

### Stripe CLI reçoit un HTTP `400`

- vérifier que le listener et le backend utilisent le même secret `whsec_...` ;
- vérifier l'URL `/api/v1/webhooks/stripe` ;
- ne pas utiliser le secret d'un ancien listener ou d'un endpoint Dashboard.

### Aucun code de connexion n'arrive

- ouvrir `http://localhost:8025` ;
- vérifier le destinataire ;
- consulter les logs `backend` et `mailpit`.

### L'application répond `502`

Vérifier l'état des services puis relancer la stack :

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml ps
npm run dev:up
```

## Références

- [`PAYMENT_TEST_PATHS.md`](./PAYMENT_TEST_PATHS.md) : scénarios et commandes détaillés
- [`PAYMENT_SECURITY_OPERATIONS.md`](./PAYMENT_SECURITY_OPERATIONS.md) : diagnostic et reprise
- [`PAYMENT_GO_LIVE_CHECKLIST.md`](./PAYMENT_GO_LIVE_CHECKLIST.md) : passage en production
- [Documentation officielle des tests Stripe](https://docs.stripe.com/testing)
- [Documentation officielle des webhooks Stripe](https://docs.stripe.com/webhooks)
