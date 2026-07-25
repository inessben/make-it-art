# Decisions techniques

## 1) Docker Compose dans `infrastructure/`

Decision: le fichier compose reste dans `infrastructure/docker-compose.yml`.

Raison: separer clairement le code applicatif (`frontend/`, `backend/`) et l'infra (`infrastructure/`).

## 2) Variables d'environnement

Decision: source unique pour Docker local = `infrastructure/.env`.

Raison: eviter les conflits entre plusieurs `.env` au demarrage compose.

## 3) Health endpoints

Decision: endpoint backend `/health` + proxy `/api/health` via Nginx.

Raison: verification rapide du service en local et en CI/CD.

## 4) Quality gate

Decision: lint + format check obligatoires avant commit/push et avant `npm run dev`.

Raison: garantir un code propre et homogene dans l'equipe.

## 5) CI

Decision: CI sur `develop` et PR vers `develop/main`.

Raison: bloquer les regressions avant merge.

## 6) Lancement Stripe France B2C

Décision du 24 juillet 2026 :

- Make It Art est le marchand officiel jusqu'à l'activation ultérieure de Stripe Connect. Make It Art porte la relation client, l'encaissement, les factures de vente, les remboursements, les litiges et les frais Stripe.
- Le lancement accepte uniquement les particuliers disposant d'une adresse de facturation française. Toute donnée professionnelle ou adresse hors France est refusée côté serveur.
- Les prix sont affichés et encaissés TTC. Le taux français, validé par le responsable fiscal, est configuré en points de base et figé avec les montants HT/TVA/TTC dans chaque commande.
- Stripe Tax reste désactivé en phase 1. Une inscription fiscale active, les codes fiscaux des œuvres, la collecte des identifiants TVA et les tests sandbox sont obligatoires avant une vente professionnelle ou hors France.
- Seule la carte est activée au lancement par une Payment Method Configuration Stripe dédiée. Apple Pay, Google Pay et les moyens asynchrones restent masqués jusqu'à une recette réelle de bout en bout.
- La politique de litige est `SUSPEND_ON_OPEN` : les droits sont suspendus à l'ouverture, restaurés si le litige est gagné ou prévenu, et révoqués s'il est perdu.
- Une facture de vente Make It Art → client est générée après paiement. La commission artiste de 7 % HT après réduction est déjà figée dans le snapshot, mais sa facturation reste désactivée jusqu'à la phase commission.

Raison : lancer un périmètre étroit et vérifiable sans activer implicitement une responsabilité fiscale, un moyen de paiement ou un flux de fonds non validé.

## 7) Migration vers Checkout Sessions custom

Décision du 24 juillet 2026 : le flux PaymentIntent + Payment Element actuel est conservé pour le lancement carte, puis migré vers Checkout Sessions avec `ui_mode: custom` avant Stripe Tax, remises, B2B, vente hors France ou ajout de nouveaux moyens de paiement.

La migration devra :

- persister l'identifiant de Checkout Session à côté du PaymentIntent ;
- conserver les snapshots, réservations, reprises et commandes PaymentIntent existantes ;
- dédupliquer les webhooks Session et PaymentIntent vers une seule finalisation ;
- être validée en sandbox sur succès, refus, 3DS, expiration, reprise, remboursement et rollback ;
- continuer à utiliser les moyens dynamiques Stripe sans renseigner `payment_method_types`.

Raison : suivre l'API recommandée par Stripe pour les futures taxes et remises sans introduire ce changement structurel dans le lancement carte déjà testé.
