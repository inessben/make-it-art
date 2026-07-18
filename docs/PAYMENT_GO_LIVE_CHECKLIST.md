# Checklist Stripe avant mode live

La production démarre avec `CHECKOUT_ENABLED=false`. Chaque ligne doit avoir une preuve datée avant
de passer la valeur à `true`.

- [ ] `npm run ci` et tests PostgreSQL passent sur le commit candidat.
- [ ] `npm run security:audit` ne signale aucune vulnérabilité haute ou critique non acceptée.
- [ ] Clé restreinte/live, clé publiable live et secret webhook live injectés par le gestionnaire de secrets.
- [ ] Endpoint `https://www.makeitart.io/api/v1/webhooks/stripe` sans redirection, TLS valide, sept événements paiement/remboursement requis abonnés.
- [ ] Signatures valide, invalide, expirée, payload modifié, rejeu, concurrence et ordre inversé testés en sandbox/Stripe CLI.
- [ ] Cartes/moyens de test Stripe : succès, refus, traitement différé, 3DS réussi, refusé et annulé.
- [ ] Perte réseau avant/après confirmation et reprise du même PaymentIntent vérifiées.
- [ ] Remboursements partiel, total, refusé, concurrent et rejoué validés avec `refund.created`, `refund.updated` et `refund.failed`.
- [ ] Montant, devise, quantité, commande et utilisateur falsifiés rejetés.
- [ ] Domaine `makeitart.io` et sous-domaines de paiement enregistrés pour les wallets.
- [ ] CSP, CORS, en-têtes HTTP et réponses `private, no-store` vérifiés sur l'URL publique.
- [ ] Email/outil d'alerte testé et rapprochement manuel exécuté.
- [ ] Procédure de rotation et responsabilité PCI revues par les responsables désignés.
- [ ] Coupe-circuit testé : checkout `503`, webhook signé toujours `2xx`, paiement engagé finalisé.

Après collecte des preuves, renseigner les variables d'acquittement, exécuter
`npm --prefix backend run payments:validate-go-live`, conserver sa sortie dans le dossier de release,
puis seulement définir `CHECKOUT_ENABLED=true` et redéployer.
