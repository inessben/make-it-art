# Circuit QA — moyens de paiement Stripe

## 1. Objectif et périmètre

Ce circuit vérifie l'enregistrement, le réaffichage, la réutilisation et la suppression des cartes
Stripe dans Make It Art. Il complète le parcours de paiement général décrit dans
`GUIDE_QA_STRIPE_PAS_A_PAS.md`.

Le lancement reste limité aux conditions suivantes :

- environnement Stripe sandbox uniquement pour la recette ;
- acheteurs particuliers en France ;
- carte bancaire uniquement ;
- paiement ponctuel et confirmé par l'acheteur (`on_session`) ;
- aucun débit automatique ou hors session ;
- aucune donnée PAN ou CVC stockée par Make It Art ;
- état final accordé uniquement après confirmation serveur signée ou rapprochement Stripe.

## 2. Préconditions

- Les services `frontend`, `backend`, `db`, `redis`, `nginx` et `mailpit` sont sains.
- `STRIPE_SECRET_KEY` et `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` appartiennent au même sandbox.
- `STRIPE_WEBHOOK_SECRET` correspond au processus `stripe listen` actif.
- `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID` référence la configuration sandbox carte uniquement.
- `SAVED_PAYMENT_METHOD_CONSENT_VERSION` est une date `YYYY-MM-DD`.
- `CHECKOUT_ENABLED=true`, `PAYMENT_MARKET_COUNTRY=FR`, `PAYMENT_CUSTOMER_SCOPE=B2C` et
  `STRIPE_TAX_ENABLED=false`.
- La migration `20260726150000_saved_payment_methods` est appliquée.
- Une vraie carte et une clé live ne sont jamais utilisées pendant cette recette.

## 3. Preuves à conserver

Pour chaque anomalie, relever uniquement :

- l'identifiant du cas QA ;
- l'UUID public de la commande ;
- l'identifiant technique `pi_*`, `pm_*`, `cus_*` ou `evt_*` si nécessaire ;
- le statut HTTP et le code d'erreur applicatif ;
- une capture sans secret, cookie, adresse complète, PAN ou CVC ;
- les états locaux avant et après.

Ne jamais copier un `client_secret`, une clé Stripe, un cookie ou le payload complet d'un webhook.

## 4. Matrice de recette

### A. Configuration et contrat technique

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-CONF-01 | Démarrage en sandbox | Le backend détecte le mode test et refuse toute clé live dans le validateur sandbox. |
| PM-CONF-02 | Payment Method Configuration | La configuration `pmc_*` est présente et seule la carte est proposée. |
| PM-CONF-03 | Version du consentement | Une date valide démarre ; une valeur comme `latest` est refusée en production. |
| PM-CONF-04 | Schéma et migration | `stripe_customer_id` est unique et le consentement est unique par utilisateur et `pm_*`. |
| PM-CONF-05 | API Stripe | Aucun appel de création ne force `payment_method_types`; la `pmc_*` pilote le périmètre. |
| PM-CONF-06 | Permissions de clé | Customers, Customer Sessions, PaymentIntents et PaymentMethods disposent uniquement des droits nécessaires. |

### B. Création du contexte Stripe Customer

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-CUST-01 | Premier checkout d'un acheteur | Un seul `cus_*` est créé et rattaché à l'utilisateur. |
| PM-CUST-02 | Deuxième checkout du même acheteur | Le même `cus_*` est réutilisé ; aucun client Stripe doublon n'est créé. |
| PM-CUST-03 | Deux checkouts concurrents | L'idempotence retourne un seul client persistant. |
| PM-CUST-04 | Customer Stripe supprimé | Le lien obsolète est remplacé sans réutiliser le résultat d'idempotence du client supprimé. |
| PM-CUST-05 | Échec Customer Session | Le paiement avec une nouvelle carte reste possible, mais l'enregistrement est annoncé indisponible. |
| PM-CUST-06 | Cohérence PaymentIntent | Le `customer` du PaymentIntent doit correspondre au `stripe_customer_id` local. |

### C. Enregistrement pendant un achat

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-SAVE-01 | Checkout éligible | Le backend retourne un secret Customer Session uniquement avec `savedPaymentMethodsAvailable=true`. |
| PM-SAVE-02 | Secret absent ou invalide | Le frontend ne le transmet pas à Stripe Elements et continue en paiement carte simple. |
| PM-SAVE-03 | Paiement sans cocher l'enregistrement | La commande est payée, mais aucun consentement local et aucune carte réaffichable ne sont créés. |
| PM-SAVE-04 | Paiement avec consentement Stripe | La commande est payée et la carte devient réaffichable pour les achats futurs en présence du client. |
| PM-SAVE-05 | Paiement refusé | Aucun consentement local n'est enregistré et aucun droit n'est accordé. |
| PM-SAVE-06 | 3DS abandonné ou refusé | Aucune carte n'est considérée enregistrée avant un succès authentifié. |
| PM-SAVE-07 | Webhook dupliqué | Un seul consentement actif existe pour le couple utilisateur / carte. |
| PM-SAVE-08 | Usage inattendu | Une valeur `setup_future_usage` autre que `on_session` est mise en revue et ne crée aucun consentement. |

### D. Réaffichage et réutilisation

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-USE-01 | Page sans carte | L'état vide est affiché sans erreur et sans création implicite de Customer. |
| PM-USE-02 | Page avec carte | Seuls marque, quatre derniers chiffres et expiration sont affichés. |
| PM-USE-03 | Carte non réaffichable | Une carte dont `allow_redisplay` n'est pas `always` n'est pas retournée par l'API. |
| PM-USE-04 | Deuxième achat avec la même carte | La carte est proposée ; l'acheteur doit confirmer et un nouveau PaymentIntent est créé pour la nouvelle commande. |
| PM-USE-05 | Aucun débit automatique | Ouvrir la page, sélectionner une carte ou abandonner le checkout ne crée aucun paiement réussi. |
| PM-USE-06 | Plusieurs cartes | Jusqu'à cinq cartes peuvent être réaffichées sans fuite d'identifiant Customer. |
| PM-USE-07 | Rechargement du checkout | Le même PaymentIntent est repris et une nouvelle Customer Session courte peut être créée. |
| PM-USE-08 | Même carte, webhook manqué | Stripe peut réussir, mais Make It Art reste prudent puis se réconcilie sans demander un second débit. |

### E. Suppression d'une carte

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-DEL-01 | Annulation dans l'interface | Cliquer sur Supprimer puis Annuler ne modifie rien. |
| PM-DEL-02 | Confirmation | La carte est détachée chez Stripe, disparaît de la liste et un message de succès est annoncé. |
| PM-DEL-03 | Rechargement après suppression | La carte ne réapparaît pas. |
| PM-DEL-04 | Consentement et audit | `revoked_at` est renseigné et un audit `SAVED_PAYMENT_METHOD_REMOVED` existe. |
| PM-DEL-05 | Suppression d'une carte tierce | Réponse `404`, aucun détachement et aucune fuite sur le propriétaire. |
| PM-DEL-06 | Identifiant `pm_*` invalide | Réponse `404` sans appel Stripe. |
| PM-DEL-07 | Double clic / rejeu | Une seule suppression est envoyée ; le second résultat reste sûr. |
| PM-DEL-08 | Échec Stripe | L'interface conserve la carte et affiche un message générique sans donnée fournisseur. |
| PM-DEL-09 | Effet sur l'historique | La suppression ne modifie ni commande, ni facture, ni remboursement passé. |

### F. Authentification, autorisation et confidentialité

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-SEC-01 | Accès anonyme à la page | Redirection vers la connexion. |
| PM-SEC-02 | `GET /payment-methods` anonyme | `401`, aucune donnée. |
| PM-SEC-03 | `DELETE` sans CSRF | `403`, aucune opération Stripe. |
| PM-SEC-04 | Cache HTTP | Les réponses de liste et suppression portent `Cache-Control: private, no-store`. |
| PM-SEC-05 | Données minimales | Aucune réponse ne contient Customer ID, fingerprint, PAN, CVC ou `client_secret`. |
| PM-SEC-06 | Journalisation | Les erreurs ne journalisent ni clé, ni secret, ni détail bancaire. |
| PM-SEC-07 | Rate limit | Un abus est limité sans bloquer durablement un usage normal. |
| PM-SEC-08 | Injection dans l'identifiant | Encodage, chaînes longues et caractères spéciaux restent sans effet et retournent une erreur sûre. |
| PM-SEC-09 | Scanner de secrets | Le dépôt suivi ne contient aucune clé réelle ni secret Stripe. |

### G. UX, accessibilité et résilience

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-UX-01 | Chargement | Un état de chargement explicite est visible. |
| PM-UX-02 | Erreur de liste | Un état d'erreur et une action Réessayer sont disponibles. |
| PM-UX-03 | Confirmation destructive | La suppression nécessite une seconde action explicite. |
| PM-UX-04 | Action en cours | Les boutons sont désactivés pendant la suppression. |
| PM-UX-05 | Retour utilisateur | Succès avec `role=status`, erreur avec `role=alert`. |
| PM-UX-06 | Navigation clavier | Les actions sont atteignables et l'ordre du focus est cohérent. |
| PM-UX-07 | Responsive | La liste reste lisible sur largeur mobile et desktop. |
| PM-UX-08 | Information légale | L'utilisateur comprend que Stripe conserve la carte et qu'aucun débit automatique n'est effectué. |

### H. Non-régression du paiement

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| PM-REG-01 | Carte neuve sans sauvegarde | Paiement nominal toujours possible. |
| PM-REG-02 | Carte enregistrée | Paiement nominal toujours confirmé par webhook ou réconciliation serveur. |
| PM-REG-03 | Carte refusée | Aucun droit, aucun consentement, reprise possible. |
| PM-REG-04 | Double soumission | Un seul PaymentIntent par snapshot et aucun double débit. |
| PM-REG-05 | Remboursement | La carte enregistrée n'altère pas les remboursements partiels ou totaux. |
| PM-REG-06 | Litige | La carte enregistrée n'altère pas la suspension/restauration des droits. |
| PM-REG-07 | Achat de sa propre œuvre | Le checkout est refusé avant toute opération Stripe. |
| PM-REG-08 | B2B ou hors France | Le checkout est refusé avant toute opération Stripe. |

## 5. Commandes automatisées

```powershell
npm run payments:validate-sandbox
npm run payments:scan-secrets
npm run security:audit
npm run ci
npm --prefix frontend run typecheck
npm --prefix frontend run build
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend ./node_modules/.bin/prisma validate --schema prisma/schema.prisma
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend node --test test/integration/checkout.service.test.js
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend node --test test/integration/payment-finalization.service.test.js test/integration/payment-schema.test.js
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T -e PAYMENT_QA_ALLOW_STRIPE_WRITES=true backend npm run payments:qa-saved-methods
```

La dernière commande crée temporairement un Customer et une carte de test dans Stripe sandbox,
vérifie leur rattachement, leur réaffichage, la Customer Session et leur détachement, puis supprime
le Customer. Elle refuse une clé live et exige volontairement l'acquittement
`PAYMENT_QA_ALLOW_STRIPE_WRITES=true`.

## 6. Jeux de données sandbox

- Succès : carte Stripe de test `4242 4242 4242 4242`.
- Refus : carte Stripe de test `4000 0000 0000 0002`.
- 3DS : carte Stripe de test `4000 0000 0000 3220`.
- Utiliser une date future et un CVC de test ; ne jamais employer une vraie carte.
- Créer une fixture indépendante pour chaque paiement terminal afin de ne pas confondre les commandes.

## 7. Critères de sortie

La fonctionnalité peut être proposée en production seulement si :

- tous les cas P0/P1 automatisables passent ;
- le parcours sauvegarder → réafficher → deuxième achat → supprimer passe avec Stripe sandbox ;
- aucun double débit, faux succès ou accès accordé avant confirmation serveur n'est observé ;
- les permissions de la clé restreinte live ont été validées en sandbox ;
- les secrets de production sont distincts et stockés hors du dépôt ;
- les scénarios restant manuels sont attribués et documentés avant activation de `CHECKOUT_ENABLED`.

## 8. Journal d'exécution

### Passage du 27 juillet 2026

| Lot | Résultat | Détails |
| --- | --- | --- |
| Installation propre | PASS | `npm ci` reproductible ; génération du client Prisma ajoutée après installation. |
| Qualité et tests unitaires | PASS | Backend : 269 tests, 232 réussis et 37 intégrations ignorées hors base ; frontend : 47/47 réussis. |
| Intégrations avec PostgreSQL | PASS | Checkout : 11/11 ; finalisation et schéma paiement : 7/7. |
| Tests ciblés cartes enregistrées | PASS | 16/16 ; couverture lignes du service : 86,01 %, routes : 93,44 %. |
| Frontend checkout sécurisé | PASS | Couverture lignes : 92,31 %. |
| Typecheck et build Nuxt | PASS | Vérification TypeScript et build de production terminés sans erreur. |
| Prisma | PASS | Schéma validé dans le conteneur backend. |
| Dépendances de production | PASS | Audit backend et frontend : aucune vulnérabilité de production détectée. |
| Secrets | PASS | Validation sandbox et scanner du dépôt terminés sans secret suivi détecté. |
| Contrôles HTTP anonymes | PASS | Liste, suppression et checkout refusés en `401` ; fausse signature webhook refusée en `400`. |
| Interface authentifiée | PASS partiel | Navigation, état vide, contenu minimal et affichage mobile sans débordement validés. |
| Cycle Stripe API sandbox | PASS | Customer, carte de test, `allow_redisplay`, Customer Session, liste et détachement validés avec nettoyage. |

L'audit global du monorepo signale encore des alertes dans l'outillage de développement ou les
dépendances optionnelles, notamment autour de l'ancienne chaîne ESLint. Les deux applications
exécutées en production ont été contrôlées séparément avec leurs propres fichiers de verrouillage et
ne remontent aucune vulnérabilité de production. La mise à niveau de l'outillage reste une tâche de
maintenance distincte ; ne pas lancer `npm audit fix --force` sans préparer la migration majeure.

### Scénarios interactifs restant à exécuter

Le smoke test Stripe vérifie le contrat API réel, mais ne remplace pas l'interaction avec le Payment
Element. Avant activation en production, exécuter et consigner :

1. achat avec `4242 4242 4242 4242` sans enregistrer la carte ;
2. achat avec la même carte en acceptant son enregistrement ;
3. deuxième achat en sélectionnant la carte réaffichée, sans double débit ;
4. suppression depuis `/payment-methods`, puis rechargement et vérification de l'audit local ;
5. refus avec `4000 0000 0000 0002` et abandon/refus 3DS avec `4000 0000 0000 3220` ;
6. rejeu d'un webhook puis simulation d'un webhook manqué avec rapprochement serveur.

Ces six scénarios sont le dernier jalon de recette de la fonctionnalité. Tant qu'ils ne sont pas tous
PASS avec leurs preuves, le circuit QA n'accorde pas de feu vert à l'activation de production.
