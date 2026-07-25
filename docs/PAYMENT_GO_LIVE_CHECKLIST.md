# Checklist Stripe avant mode live

La production démarre avec `CHECKOUT_ENABLED=false`. Chaque ligne doit avoir une preuve datée avant
de passer la valeur à `true`.

- [ ] `npm run ci` et tests PostgreSQL passent sur le commit candidat.
- [ ] `npm run security:audit` ne signale aucune vulnérabilité haute ou critique non acceptée.
- [ ] Clé restreinte/live, clé publiable live et secret webhook live injectés par le gestionnaire de secrets.
- [ ] Clé serveur `rk_live_*` limitée aux ressources réellement utilisées ; restriction d'IP activée lorsque l'infrastructure dispose d'une sortie stable.
- [ ] SDK et requêtes serveur revus avec l'API Stripe `2026-06-24.dahlia` ; endpoint webhook configuré et testé sur cette version.
- [ ] Endpoint `https://www.makeitart.io/api/v1/webhooks/stripe` sans redirection, TLS valide, dix événements paiement/remboursement/litige requis abonnés.
- [ ] Plages IP Stripe autorisées au niveau edge lorsque cela est compatible avec le proxy ; la vérification de signature reste obligatoire dans tous les cas.
- [ ] Signatures valide, invalide, expirée, payload modifié, rejeu, concurrence et ordre inversé testés en sandbox/Stripe CLI.
- [ ] Cartes de test Stripe : succès, refus et 3DS réussi/refusé/annulé ; aucun moyen asynchrone présenté au lancement.
- [ ] Perte réseau avant/après confirmation et reprise du même PaymentIntent vérifiées.
- [ ] Remboursements partiel, total, refusé, concurrent et rejoué validés avec `refund.created`, `refund.updated` et `refund.failed`.
- [ ] Montant, devise, quantité, commande et utilisateur falsifiés rejetés.
- [ ] Payment Method Configuration `pmc_*` live dédiée au lancement, limitée à la carte ; Link, Apple Pay, Google Pay et moyens asynchrones désactivés.
- [ ] Paiement réel carte testé de bout en bout ; l'enregistrement des domaines wallet est reporté à la recette Apple Pay/Google Pay.
- [ ] Périmètre France B2C et rôle de marchand officiel Make It Art validés ; toute adresse hors France et toute donnée professionnelle sont refusées.
- [ ] Identité légale, immatriculation, numéro de TVA et taux `FRANCE_B2C_VAT_RATE_BPS` confirmés par les responsables fiscal/comptable.
- [ ] Facture de vente sandbox vérifiée : numéro séquentiel, émetteur/destinataire, lignes, HT, TVA, TTC, empreinte et accès propriétaire.
- [ ] `STRIPE_TAX_ENABLED=false` ; aucune activation avant inscription active, codes fiscaux, collecte TVA et scénarios B2B/hors France/remboursement de phase 2.
- [ ] Décision d'architecture `PAY-US-16` datée et `PAYMENT_ARCHITECTURE_DECISION_ACK=true`.
- [ ] Périmètre des moyens de paiement validé et `PAYMENT_METHODS_POLICY_ACK=true`; les moyens asynchrones restent désactivés tant que leur cycle de vie n'est pas accepté.
- [ ] Décision fiscale acquittée avec `PAYMENT_FISCAL_POLICY_ACK=true`.
- [ ] Worker d'outbox vérifié pour l'email, les droits numériques, les certificats et la facture de vente, y compris rejeu, crash et priorité de révocation.
- [ ] Politique `DISPUTE_RIGHTS_POLICY=SUSPEND_ON_OPEN` acquittée avec `DISPUTE_RIGHTS_POLICY_CONFIRMED=true` et testée sur litige ouvert/gagné/prévenu/perdu.
- [ ] Synchronisation de preuve testée ; l'auteur d'une action Dashboard est vérifié dans l'audit Stripe et l'opérateur de synchronisation dans l'audit Make It Art.
- [ ] CSP, CORS, en-têtes HTTP et réponses `private, no-store` vérifiés sur l'URL publique.
- [ ] Email/outil d'alerte testé et rapprochement manuel exécuté.
- [ ] Paiement réel de faible montant autorisé par le responsable avec `PAYMENT_LIVE_SMOKE_TEST_APPROVED=true`.
- [ ] Procédure de rotation et responsabilité PCI revues par les responsables désignés.
- [ ] Coupe-circuit testé : checkout `503`, webhook signé toujours `2xx`, paiement engagé finalisé.

Après collecte des preuves, renseigner les variables d'acquittement, exécuter
`npm --prefix backend run payments:validate-go-live`, conserver sa sortie dans le dossier de release,
puis seulement définir `CHECKOUT_ENABLED=true` et redéployer.

Le backend exécute également cette validation à son démarrage lorsque `NODE_ENV=production` et
`CHECKOUT_ENABLED=true`. La procédure documentée ne peut donc pas être contournée par un simple
changement de variable.
