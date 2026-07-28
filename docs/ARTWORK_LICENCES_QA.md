# QA — licences et ventes d'oeuvres

## 1. Objectif

Cette campagne valide les six user stories du MVP :

- choix obligatoire entre `PERSONAL`, `COMMERCIAL` et `EXCLUSIVE` à la publication ;
- achats sans limite de stock pour les licences personnelle et commerciale ;
- états publics `AVAILABLE`, `RESERVED` et `SOLD` pour une oeuvre exclusive ;
- réservation atomique avant la création du paiement Stripe ;
- finalisation unique et idempotente après confirmation Stripe ;
- libération sûre après annulation ou expiration, sans réouverture d'une oeuvre vendue.

Le remboursement est inclus comme non-régression : une exclusive remboursée reste vendue et ses
droits numériques sont révoqués uniquement après un remboursement total confirmé.

## 2. Priorités et règle de sortie

- **P0** : risque de double débit, double vente, faux succès ou réouverture d'une exclusive vendue.
- **P1** : règle métier incorrecte, licence perdue, réservation bloquée ou droits incohérents.
- **P2** : affichage, libellé ou retour utilisateur incorrect sans perte financière.

La QA est acceptée lorsque tous les cas automatisés P0/P1 passent avec PostgreSQL, que le lint et le
formatage sont valides et qu'aucun test de la commande dédiée n'est ignoré. Les scénarios Stripe
sandbox et navigateur restent à signer manuellement avant une mise en production.

## 3. Matrice automatisée

### A. Publication et persistance

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-PUB-01 | P1 | Le formulaire charge les choix | Les trois valeurs sont présentes une seule fois. |
| LIC-PUB-02 | P1 | Publication personnelle | `PERSONAL` est transmise et persistée. |
| LIC-PUB-03 | P1 | Publication commerciale | `COMMERCIAL` est transmise et persistée. |
| LIC-PUB-04 | P0 | Publication exclusive | `EXCLUSIVE` est transmise avec un stock initial de `1`. |
| LIC-PUB-05 | P1 | Licence absente | Requête refusée en `400`, aucune oeuvre créée. |
| LIC-PUB-06 | P1 | Licence inconnue | Requête refusée en `400`, aucune oeuvre créée. |
| LIC-PUB-07 | P1 | Snapshot de commande | Le type acheté reste enregistré sur l'item de commande. |
| LIC-PUB-08 | P0 | Publication commerciale sans description | Requête refusée en `400`, aucune oeuvre créée ; le formulaire précise que les conditions d'utilisation commerciale doivent figurer dans la description. |

### B. Licences personnelle et commerciale

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-STD-01 | P0 | Achat personnel avec stock à zéro | Checkout autorisé sans réservation d'inventaire. |
| LIC-STD-02 | P0 | Deuxième achat personnel | Nouvelle commande et nouveau PaymentIntent autorisés. |
| LIC-STD-03 | P0 | Achat commercial avec stock à zéro | Checkout autorisé sans réservation d'inventaire. |
| LIC-STD-04 | P0 | Deuxième achat commercial | Nouvelle commande et nouveau PaymentIntent autorisés. |
| LIC-STD-05 | P1 | Paiement standard réussi | L'oeuvre reste `AVAILABLE`, stock et réservation restent à zéro. |
| LIC-STD-06 | P1 | Historique | Chaque commande conserve la licence applicable lors de l'achat. |

### C. Disponibilité exclusive

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-AVL-01 | P1 | Exclusive libre | API et UI exposent `AVAILABLE`. |
| LIC-AVL-02 | P1 | Exclusive réservée | API et UI exposent `RESERVED`. |
| LIC-AVL-03 | P1 | Exclusive vendue | API et UI exposent `SOLD`. |
| LIC-AVL-04 | P1 | Licence standard sans stock | Elle reste disponible sans afficher un faux état vendu. |

### D. Concurrence et idempotence

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-RACE-01 | P0 | Huit acheteurs cliquent simultanément | Un seul checkout réussit, sept échouent proprement. |
| LIC-RACE-02 | P0 | Comptage Stripe simulé après la course | Un seul PaymentIntent est créé. |
| LIC-RACE-03 | P0 | Comptage local après la course | Une commande, un paiement et une réservation active existent. |
| LIC-RACE-04 | P0 | Deux requêtes identiques du gagnant | Le même PaymentIntent est retourné. |
| LIC-RACE-05 | P0 | Contraintes PostgreSQL | Stock et quantité réservée d'une exclusive ne peuvent dépasser `1`. |

### E. Cycle de paiement Stripe

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-PAY-01 | P0 | Webhook `succeeded` valide | Réservation consommée et oeuvre marquée vendue atomiquement. |
| LIC-PAY-02 | P0 | Webhook identique rejoué | Aucun second effet financier ou métier. |
| LIC-PAY-03 | P0 | Deux succès distincts concurrents | Un seul stock consommé et un seul lot de tâches créé. |
| LIC-PAY-04 | P0 | Montant ou devise incohérents | Mise en revue, aucune livraison et oeuvre non vendue. |
| LIC-PAY-05 | P0 | Échec de carte réessayable | Réservation conservée jusqu'au nouvel essai ou à l'expiration. |
| LIC-PAY-06 | P0 | Nouvel essai réussi | Même commande payée avec la nouvelle charge, une seule vente. |
| LIC-PAY-07 | P0 | Annulation après succès reçue en retard | Commande payée et oeuvre vendue ne régressent pas. |
| LIC-PAY-08 | P1 | Paiement en traitement | Aucun secret réutilisable n'est exposé et la réservation reste active. |

### F. Annulation, expiration et remboursement

| ID | Prio | Scénario | Résultat attendu |
| --- | --- | --- | --- |
| LIC-REL-01 | P0 | PaymentIntent annulé | Réservation libérée une seule fois et oeuvre `AVAILABLE`. |
| LIC-REL-02 | P0 | Checkout expiré | Stripe est annulé avant la libération locale. |
| LIC-REL-03 | P0 | Deux passages du job d'expiration | Le second passage ne modifie rien. |
| LIC-REL-04 | P1 | Nouvel acheteur après expiration | Une nouvelle réservation peut être créée. |
| LIC-REL-05 | P0 | Libération tardive d'une oeuvre vendue | L'oeuvre ne peut pas être réouverte. |
| LIC-REF-01 | P1 | Remboursement partiel | Droits actifs et exclusive toujours `SOLD_OUT`. |
| LIC-REF-02 | P0 | Remboursement total confirmé | Commande `REFUNDED`, droits révoqués, exclusive toujours `SOLD_OUT`. |
| LIC-REF-03 | P1 | Remboursement échoué | Commande payée, droits et état de l'oeuvre inchangés. |
| LIC-REF-04 | P0 | Webhook de remboursement falsifié | Mise en revue sans mutation financière ou commerciale. |

## 4. Exécution automatisée

Prérequis : la stack Docker de développement doit être démarrée et saine.

```powershell
npm.cmd run qa:artwork-licences
```

La commande :

1. applique les migrations Prisma dans le conteneur backend ;
2. exige une vraie `DATABASE_URL` PostgreSQL ;
3. régénère le client Prisma pour éviter de tester avec un schéma obsolète ;
4. exécute les tests ciblés backend, y compris la concurrence ;
5. exécute les tests frontend des choix, états et remboursements.

Elle utilise des doubles Stripe en mémoire et ne crée aucun paiement réel, même dans le sandbox.

Pour la non-régression complète :

```powershell
npm.cmd run quality
docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml exec -T backend npm test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend run build
npm.cmd run payments:scan-secrets
```

## 5. Recette manuelle navigateur et Stripe sandbox

Ces cas complètent l'automatisation sans jamais utiliser de carte réelle :

| ID | Prio | Action | Preuve attendue |
| --- | --- | --- | --- |
| LIC-UI-01 | P1 | Ouvrir `/artworks/new` comme artiste vérifié | Trois radios visibles, aucun choix précoché, champ obligatoire. |
| LIC-UI-02 | P1 | Publier une oeuvre de chaque type | Badge correct dans le catalogue et la fiche. |
| LIC-UI-03 | P0 | Ouvrir la même exclusive dans deux sessions | Les deux voient libre avant achat ; une seule atteint le paiement. |
| LIC-UI-04 | P1 | Garder le checkout gagnant ouvert | L'autre session affiche ensuite « Réservée temporairement ». |
| LIC-UI-05 | P0 | Payer avec la carte de test Stripe de succès | Une seule commande payée et l'état devient « Vendue ». |
| LIC-UI-06 | P0 | Essayer une carte Stripe refusée | Aucun droit accordé ; la reprise reste possible jusqu'à expiration. |
| LIC-UI-07 | P1 | Annuler ou laisser expirer | L'oeuvre redevient disponible après confirmation serveur. |
| LIC-UI-08 | P1 | Rembourser partiellement puis totalement | Droits actifs puis révoqués ; l'oeuvre ne revient jamais au catalogue. |
| LIC-UI-09 | P1 | Choisir une licence commerciale sans description | Le formulaire bloque la publication et demande les conditions d'utilisation commerciale. |

Pour chaque scénario, conserver uniquement l'UUID public de commande, les références `pi_*` ou
`evt_*` nécessaires, le code HTTP et une capture expurgée. Ne jamais conserver de clé, cookie,
`client_secret`, PAN ou CVC.

## 6. Journal d'exécution

Ajouter une ligne à chaque campagne sans remplacer l'historique :

| Date | Commit | Lot | Résultat | Détail |
| --- | --- | --- | --- | --- |
| 2026-07-27 | `feat/licence-type` | Baseline PostgreSQL | PASS | 27/27 scénarios existants réussis après application des trois migrations licences. |
| 2026-07-27 | `feat/licence-type` | QA licences ciblée | PASS | Backend 52/52 avec PostgreSQL ; frontend 11/11 ; aucun test ignoré. |
| 2026-07-27 | `feat/licence-type` | Non-régression complète | PASS | Backend 291/291 avec PostgreSQL ; frontend 49/49 ; aucun test ignoré. |
| 2026-07-27 | `feat/licence-type` | Qualité et sécurité | PASS | Lint, format, typecheck, schéma Prisma, 36 migrations et scanner de secrets validés. |
| 2026-07-27 | `feat/licence-type` | Smoke HTTP local | PASS | Frontend, santé API et catalogue public répondent en HTTP `200`. |
| 2026-07-27 | `feat/licence-type` | Build Nuxt | PASS | Client, SSR et serveur Nitro compilés hors sandbox Windows. |
| 2026-07-27 | `feat/licence-type` | Recette navigateur / Stripe sandbox | À FAIRE | À exécuter avec deux sessions navigateur et un listener Stripe CLI avant production. |

Observation non bloquante : les tests de forte concurrence font apparaître un avertissement de
dépréciation `pg` sur des requêtes simultanées. Aucun échec ou état incohérent n'a été observé, mais
ce point devra être revérifié lors du passage à `pg` 9.
