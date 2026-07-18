# Sécurité et exploitation des paiements Stripe

## Secrets et séparation des environnements

- Les fichiers `.env`, `.env.production` et variantes locales sont ignorés par Git. En production,
  injecter les valeurs depuis le gestionnaire de secrets de l'hébergeur, jamais depuis l'image.
- La production refuse de démarrer sans clé `sk_live_*` ou `rk_live_*`, secret `whsec_*`, origine
  HTTPS fermée, secret JWT fort et adresse d'alerte.
- Préférer une clé restreinte `rk_live_*` limitée aux PaymentIntents, Refunds et lectures nécessaires.
  Les droits exacts doivent suivre les routes activées dans le compte Stripe.
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

## Rotation et incident

1. Désactiver les nouveaux checkouts avec le coupe-circuit documenté dans la checklist go-live, sans
   couper les webhooks.
2. Créer la nouvelle clé restreinte Stripe et l'injecter dans le gestionnaire de secrets.
3. Redéployer, vérifier `/health`, puis révoquer l'ancienne clé.
4. Pour le webhook, créer un nouvel endpoint/secret en parallèle, accepter et dédupliquer les mêmes
   `event.id`, vérifier les livraisons, puis retirer l'ancien endpoint.
5. Relancer le rapprochement et les événements `FAILED`; ne jamais supprimer le ledger webhook ni les
   commandes en cours pendant la rotation.

## PCI DSS

Stripe Elements maintient PAN et CVC dans les composants Stripe et réduit le périmètre technique, mais
ne constitue pas à lui seul une conformité PCI DSS. Faire confirmer le questionnaire applicable
(souvent SAQ A selon l'intégration finale) par l'acquéreur ou un conseiller qualifié, maintenir TLS,
contrôles d'accès, correctifs, inventaire des scripts et procédure d'incident, et conserver la preuve
de cette validation avant le mode live.
