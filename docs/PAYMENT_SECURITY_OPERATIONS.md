# Sécurité et exploitation des paiements Stripe

## Secrets et séparation des environnements

- Les fichiers `.env`, `.env.production` et variantes locales sont ignorés par Git. En production,
  injecter les valeurs depuis le gestionnaire de secrets de l'hébergeur, jamais depuis l'image.
- La production refuse de démarrer sans clé `sk_live_*` ou `rk_live_*`, secret `whsec_*`, origine
  HTTPS fermée, secret JWT fort et adresse d'alerte.
- Préférer une clé restreinte `rk_live_*` limitée aux PaymentIntents, Refunds et lectures nécessaires.
  Les droits exacts doivent suivre les routes activées dans le compte Stripe.
- Le SDK est figé sur l'API `2026-06-24.dahlia`. Toute montée de version exige tests sandbox,
  vérification des endpoints webhook et une décision de déploiement explicite.
- Lorsque l'edge peut maintenir la liste officielle sans casser le proxy, autoriser uniquement les
  plages IP Stripe sur le webhook en défense supplémentaire ; ne jamais remplacer la signature par
  ce filtrage.
- Sandbox et production utilisent des comptes/projets, bases, endpoints webhook et secrets distincts.
  Ne jamais copier une clé ou des données live dans la CI.

## Alertes et rapprochement

- Acheminer les logs structurés `payment_event` vers l'outil d'alerting. Les champs autorisés sont des
  IDs techniques, états, durées, compteurs et codes ; aucun corps Stripe n'est journalisé.
- Seuil immédiat : 10 signatures Stripe invalides par IP hachée et par minute.
- Alertes : webhook `FAILED`, rapprochement échoué, commande en `PAYMENT_PROCESSING` depuis plus de
  cinq minutes, ou `PaymentOperatorAlert` ouverte. L'adresse est `PAYMENT_ALERT_EMAIL`.
- Le rapprochement relit Stripe toutes les cinq minutes. Il applique le même processeur idempotent que
  les webhooks et n'accorde jamais de droit à partir du navigateur.
- `npm run payments:reconcile` produit une comparaison Stripe/locale sans mutation. L'option
  `--apply` n'est utilisée qu'après revue de ce diagnostic ; en production elle exige aussi
  `--confirm=STRIPE_IS_SOURCE_OF_TRUTH`. Aucun identifiant secret n'est écrit dans la sortie.
- Les lignes `FulfillmentTask` constituent une outbox. Le worker prend les tâches par verrou
  `SKIP LOCKED`, utilise un bail récupérable après crash et applique un backoff borné. Une tâche
  `COMPLETED` porte la référence technique de l'effet ; une simple ligne `PENDING` n'est jamais une
  preuve de livraison.
- `SEND_PAYMENT_CONFIRMATION` et `SEND_REFUND_STATUS` sont exécutées via SMTP avec un `Message-ID`
  stable. Celui-ci limite les doublons visibles, sans transformer SMTP en garantie exactly-once.
- `GRANT_DOWNLOAD_RIGHTS`, `REVOKE_DOWNLOAD_RIGHTS` et `GENERATE_CERTIFICATE` écrivent des effets
  durables et uniques par ligne de commande. Les droits et certificats sont visibles uniquement dans
  la commande privée. Une commande totalement remboursée ne peut pas être livrée de nouveau, même si
  une ancienne tâche d'octroi est rejouée après la révocation.
- Le worker tourne même quand `CHECKOUT_ENABLED=false`, afin de terminer les paiements déjà engagés.
  Une exécution ponctuelle est disponible avec `npm run payments:fulfillment` dans le backend.
- Le moniteur d'anomalies tourne selon `PAYMENT_ANOMALY_SWEEP_MS`. Il agrège les webhooks échoués
  ou anciens, les tâches échouées ou dont le bail a expiré, les commandes trop longtemps en
  `PAYMENT_PROCESSING`, les commandes `PAYMENT_REVIEW` et les alertes opérateur ouvertes. Les emails
  sont limités par catégorie pendant `PAYMENT_ALERT_COOLDOWN_SECONDS` et ne contiennent qu'un code,
  un compteur, une référence technique, une ancienneté et l'action recommandée.

## Runbook des anomalies P0

Toutes les opérations se font depuis `/admin/payments`. Elles exigent un administrateur, une
authentification de moins de dix minutes, un jeton CSRF et sont auditées. Il n'existe aucune route ni
aucun bouton permettant de forcer une commande à `PAID`.

### Webhook `FAILED` ou trop ancien

1. Vérifier le type, la référence `evt_*`, l'ancienneté et le code d'erreur dans la supervision, puis
   vérifier l'incident correspondant dans le Dashboard Stripe.
2. Utiliser « Rejouer depuis Stripe ». Le backend récupère à nouveau l'événement auprès de Stripe,
   vérifie son identifiant, son type, son objet et son mode, puis appelle le processeur idempotent.
3. Si Stripe ne permet plus de récupérer l'événement, rapprocher la commande avec son PaymentIntent.
   Ne jamais reconstruire un événement depuis une donnée copiée du navigateur.
4. Si le rejeu échoue encore, conserver l'alerte ouverte, désactiver les nouveaux checkouts si
   l'impact s'étend, puis escalader avec la référence technique et le code non sensible.

### Tâche de finalisation `FAILED` ou bail expiré

1. Identifier le handler et son code d'erreur. Pour un droit ou un certificat, contrôler également
   l'état durable affiché sur la commande privée : `ACTIVE`, `SUSPENDED` ou `REVOKED`.
2. Corriger ou rétablir la dépendance, puis utiliser « Remettre en file ». La même `taskKey`, le verrou
   de worker et la référence d'effet protègent le rejeu concurrent.
3. Vérifier que la tâche devient `COMPLETED` et que l'effet attendu existe une seule fois. Si elle
   repasse en `FAILED`, laisser l'alerte ouverte et escalader au propriétaire du handler.

### Commande bloquée ou `PAYMENT_REVIEW`

1. Utiliser « Rapprocher avec Stripe ». Le backend relit uniquement le PaymentIntent persisté et
   valide l'identifiant, le mode, le montant, la devise, la commande et le montant reçu avant toute
   transition.
2. Si Stripe et le ledger local restent incohérents, ne pas clôturer l'alerte et ne pas livrer. Ouvrir
   une investigation avec la référence publique de commande.
3. Quand les statuts commande/paiement redeviennent cohérents, utiliser « Marquer résolue ». La date,
   la cause originale et l'action de résolution restent présentes dans l'alerte et l'audit.

### Retour à l'état sûr

- En cas d'incident généralisé, positionner `CHECKOUT_ENABLED=false` et redéployer. Ce coupe-circuit
  bloque seulement les nouveaux checkouts : webhooks, rapprochement, supervision et outbox restent
  actifs pour les paiements déjà engagés.
- Le retour à la normale exige zéro anomalie P0 inexpliquée, un test sandbox du scénario en cause et
  une vérification des audits de rejeu avant de réactiver le checkout.

### Litige ou chargeback Stripe

1. Ouvrir le litige depuis la supervision et vérifier son motif, son montant, sa devise et
   l'échéance de preuve dans le Dashboard Stripe. Aucun document bancaire n'est copié dans les logs.
2. Le rattachement local repose uniquement sur le Charge ou le PaymentIntent persisté. Une metadata
   de webhook n'est jamais suffisante pour rattacher le litige à une commande.
3. Comparer le montant contesté au montant encaissé diminué des remboursements et autres expositions.
   Tout dépassement reste en alerte `DISPUTE_FINANCIAL_EXPOSURE_MISMATCH` et bloque une conclusion
   automatique.
4. Un statut gagné, perdu ou fermé reste terminal. Le paiement et les remboursements d'origine ne
   sont ni réécrits ni effacés : le résultat du litige conserve son historique propre.
5. La politique décidée est `DISPUTE_RIGHTS_POLICY=SUSPEND_ON_OPEN` avec
   `DISPUTE_RIGHTS_POLICY_CONFIRMED=true`. La production refuse toute autre valeur. L'outbox suspend
   les droits à l'ouverture, les restaure après un gain, une prévention ou une clôture favorable sans
   autre litige bloquant, et les révoque après une perte.
6. Après une soumission de preuves dans Stripe, utiliser « Synchroniser les preuves ». Le backend
   relit le litige avec la clé serveur et conserve uniquement l'opérateur de synchronisation, la date,
   le statut, le compteur, `has_evidence` et les références opaques `file_*`. Les textes libres et le
   contenu des documents restent chez Stripe. Pour une soumission faite directement dans le Dashboard,
   l'identité du soumissionnaire doit être prouvée par l'audit Stripe : l'application ne connaît que
   l'administrateur ayant déclenché la synchronisation.

## Rotation et incident

1. Désactiver les nouveaux checkouts avec le coupe-circuit documenté dans la checklist go-live, sans
   couper les webhooks.
2. Créer la nouvelle clé restreinte Stripe et l'injecter dans le gestionnaire de secrets.
3. Redéployer, vérifier `/api/health`, puis révoquer l'ancienne clé.
4. Pour le webhook, créer un nouvel endpoint/secret en parallèle, accepter et dédupliquer les mêmes
   `event.id`, vérifier les livraisons, puis retirer l'ancien endpoint.
5. Relancer le rapprochement et les événements `FAILED`; ne jamais supprimer le ledger webhook ni les
   commandes en cours pendant la rotation.

Le scan `npm run payments:scan-secrets` est exécuté avant chaque commit. Il inspecte les fichiers
suivis et non ignorés pour les clés serveur Stripe test/live, secrets webhook et `client_secret`,
sans afficher la valeur détectée. Les clés publiables `pk_*` ne sont pas traitées comme des secrets.

## PCI DSS

Stripe Elements maintient PAN et CVC dans les composants Stripe et réduit le périmètre technique, mais
ne constitue pas à lui seul une conformité PCI DSS. Faire confirmer le questionnaire applicable
(souvent SAQ A selon l'intégration finale) par l'acquéreur ou un conseiller qualifié, maintenir TLS,
contrôles d'accès, correctifs, inventaire des scripts et procédure d'incident, et conserver la preuve
de cette validation avant le mode live.
