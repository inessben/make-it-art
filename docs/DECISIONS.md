# Décisions d’architecture

Ce registre synthétise les décisions structurantes actuellement visibles dans le dépôt. Une décision modifiée doit être remplacée par une nouvelle entrée ; son historique Git reste la trace du contexte précédent.

## D-001 — Monorepo Docker

- Statut : Acceptée
- Décision : regrouper frontend, backend, infrastructure et documentation dans un dépôt unique, avec Docker Compose comme environnement de référence.
- Conséquences : versions coordonnées, démarrage reproductible et CI centralisée ; les changements transverses doivent valider toutes les couches concernées.

## D-002 — Nuxt 4 et Vue 3 pour le frontend

- Statut : Acceptée
- Décision : utiliser Nuxt 4, Vue 3, Pinia, Tailwind CSS 3 et Sass.
- Conséquences : rendu hybride possible, composants accessibles réutilisables et SDK navigateur chargés uniquement côté client.

## D-003 — API REST Express et Prisma

- Statut : Acceptée
- Décision : exposer une API REST Express sur Node.js 22, documentée avec OpenAPI, avec Prisma 7 pour PostgreSQL.
- Conséquences : contrats HTTP explicites, migrations versionnées et validation des entrées aux frontières de l’API.

## D-004 — PostgreSQL comme source de vérité et Redis comme service auxiliaire

- Statut : Acceptée
- Décision : conserver les entités métier, consentements, commandes, paiements et audits dans PostgreSQL ; utiliser Redis pour les états temporaires ou distribués.
- Conséquences : les opérations critiques restent transactionnelles en base et ne dépendent pas de Redis comme stockage durable.

## D-005 — Google OAuth complète l’authentification locale

- Statut : Acceptée
- Décision : conserver inscription/connexion par e-mail tout en proposant Google OAuth 2.0.
- Conséquences : un même compte doit être relié de manière sûre, l’e-mail doit être vérifié et les redirections doivent rester contrôlées.

## D-006 — Code de connexion renforcée par e-mail

- Statut : Acceptée avec écart connu
- Décision : sécuriser les connexions sensibles avec un code temporaire par e-mail et un appareil mémorisé.
- Conséquences : ce mécanisme est opérationnel mais ne constitue pas un TOTP. L’exigence pédagogique TOTP doit être implémentée ou faire l’objet d’une équivalence validée.

## D-007 — Stripe comme prestataire de paiement

- Statut : Acceptée
- Décision : utiliser Stripe Checkout et les webhooks comme fondement du paiement, avec idempotence, rapprochement, remboursement et audit.
- Conséquences : aucune donnée de carte brute ne transite par l’application ; une commande n’est finalisée que depuis un signal Stripe vérifié.

## D-008 — Modèle commercial initial France B2C

- Statut : Acceptée pour le MVP
- Décision : cadrer le premier passage en production sur un usage principalement B2C en France.
- Conséquences : Stripe Connect, fiscalité internationale et B2B avancé restent hors périmètre tant qu’un cadrage juridique et comptable n’est pas établi.

## D-009 — Trois types de licences numériques

- Statut : Acceptée
- Décision : proposer des licences personnelle, commerciale et exclusive, chacune avec ses contraintes métier.
- Conséquences : le prix, la disponibilité et les droits livrés doivent être figés et traçables au moment de la commande.

## D-010 — Protection raisonnable des œuvres

- Statut : Acceptée
- Décision : combiner aperçus contrôlés, filigranes, métadonnées et livraison HD autorisée après achat.
- Conséquences : l’application réduit les usages non autorisés sans prétendre empêcher toute capture ou copie côté client.

## D-011 — Wallet Coinbase CDP facultatif sur Base

- Statut : Acceptée
- Décision : fournir un portefeuille intégré non custodial Coinbase CDP sur Base, uniquement après vérification e-mail et consentement explicite.
- Conséquences : création idempotente, échec récupérable, adresse publique stockée, clé privée jamais reçue par Make It Art et export géré dans le cadre sécurisé de Coinbase.

## D-012 — Authentification CDP personnalisée avec JWKS/JWT

- Statut : Acceptée
- Décision : signer des jetons utilisateur courts côté backend et publier la clé de vérification via JWKS.
- Conséquences : issuer, audience, projet CDP, domaine autorisé et clés serveur doivent être strictement alignés par environnement.

## D-013 — Consentement préalable pour Umami

- Statut : Acceptée
- Décision : ne charger l’analytique Umami qu’après acceptation explicite des cookies non essentiels.
- Conséquences : la bannière reste visible sans décision, le refus est possible et le choix persiste sans activer le suivi.

## D-014 — Accessibilité comme contrainte transversale

- Statut : Acceptée
- Décision : appliquer WCAG AA aux composants et parcours, notamment clavier, focus, contrastes, labels, alt, titres et noms accessibles.
- Conséquences : toute nouvelle interface doit inclure ces critères dans sa définition de terminé et un audit final doit fournir les preuves de conformité.

## D-015 — Nginx en local et Caddy en production

- Statut : Acceptée
- Décision : utiliser Nginx comme point d’entrée de l’environnement local et Caddy pour le reverse proxy TLS de production.
- Conséquences : les en-têtes, routes `/api`, domaines, healthchecks et limites de taille doivent être vérifiés dans les deux configurations.

## D-016 — Secrets exclusivement hors Git

- Statut : Acceptée
- Décision : injecter les secrets par fichiers `.env` ignorés, secrets GitHub Actions ou environnement du serveur.
- Conséquences : les exemples ne contiennent que des noms et valeurs factices ; toute clé exposée doit être révoquée puis remplacée.

## D-017 — Les documents canoniques remplacent les plans parallèles

- Statut : Acceptée
- Décision : conserver un document canonique par sujet et supprimer les anciennes copies de planification devenues redondantes.
- Conséquences : `README.md`, le cahier des exigences, la roadmap, les guides spécialisés et le journal d’équipe ont chacun un rôle distinct.