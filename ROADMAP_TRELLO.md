# Roadmap Trello — Make It Art

## 1. Utilisation

Ce document transforme l’état réel du dépôt et son historique Git en cartes Trello. Il ne répète pas le cahier des exigences :

- [`REQUIREMENTS_DOCUMENT.md`](REQUIREMENTS_DOCUMENT.md) définit ce qui doit être satisfait ;
- ce fichier indique ce qui est terminé, ce qui bloque une livraison et ce qui appartient au post-MVP.

Colonnes recommandées du tableau :

1. **Backlog**
2. **Prêt**
3. **En cours**
4. **Revue**
5. **Validation production**
6. **Terminé**

Labels recommandés : `frontend`, `backend`, `infra`, `sécurité`, `paiement`, `wallet`, `accessibilité`, `documentation`, `critique`.

## 2. État global au 28 juillet 2026

Le produit fonctionnel est largement réalisé. Les journaux Git attestent notamment les lots frontend, analytics, SEO, blockchain, accessibilité, administration, paiements, licences, protection des œuvres et cycle de vie des œuvres. Le travail restant concerne principalement la preuve de conformité, l’environnement réel et quelques écarts explicites du sujet.

## 3. Cartes terminées

### Lot — Socle et infrastructure

#### Carte INFRA-01 — Conteneuriser l’environnement local

- Statut : Terminé
- Résultat : frontend, backend, PostgreSQL, Redis, proxy, Umami et Mailpit orchestrés avec Docker Compose.
- Acceptation : l’environnement démarre depuis `infrastructure/docker-compose.yml`.

#### Carte INFRA-02 — Préparer la production

- Statut : Terminé dans le dépôt
- Résultat : images backend/frontend, Compose production, Caddy, healthchecks et variables exemples.
- Reste externe : confirmer les secrets et la santé du VPS pour chaque déploiement.

#### Carte INFRA-03 — Automatiser CI/CD

- Statut : Terminé
- Résultat : contrôles frontend, backend, configuration, migrations, sécurité et construction production dans GitHub Actions.

### Lot — Authentification et comptes

#### Carte AUTH-01 — Inscription et vérification e-mail

- Statut : Terminé
- Résultat : validation du mot de passe, e-mail de vérification, blocage des parcours protégés avant validation.

#### Carte AUTH-02 — Connexion locale et cycle des jetons

- Statut : Terminé
- Résultat : connexion, refresh token, déconnexion, récupération du mot de passe et révocation.

#### Carte AUTH-03 — Google OAuth 2.0

- Statut : Terminé
- Résultat : démarrage OAuth, callback, liaison utilisateur et redirection frontend.

#### Carte AUTH-04 — Connexion renforcée

- Statut : Terminé pour le code e-mail
- Résultat : code de connexion et appareil mémorisé.
- Limite : cette carte ne satisfait pas à elle seule l’exigence TOTP exacte du sujet.

### Lot — Marketplace et expérience frontend

#### Carte FRONT-01 — Refonte de l’interface publique

- Statut : Terminé
- Résultat : accueil, catalogue, artistes, collections, navigation et pages de contenu harmonisés.

#### Carte FRONT-02 — Profils et interactions sociales

- Statut : Terminé
- Résultat : profil membre, favoris, wishlist, abonnements, notifications et collections.

#### Carte FRONT-03 — SEO technique

- Statut : Terminé
- Résultat : métadonnées, structure de pages et éléments d’indexation ajoutés.

#### Carte FRONT-04 — Accessibilité transversale

- Statut : Terminé dans le code
- Résultat : contrastes, clavier, focus, labels, alt, titres, boutons et ARIA corrigés.
- Reste : produire le rapport d’audit final.

#### Carte FRONT-05 — Consentement cookies et analytics

- Statut : Terminé
- Résultat : bannière persistante jusqu’au choix, refus/acceptation et chargement conditionnel d’Umami.

### Lot — Artistes et œuvres

#### Carte ART-01 — Candidature et contrat artiste

- Statut : Terminé
- Résultat : brouillon, soumission, contrat, validation administrative et profil artiste.

#### Carte ART-02 — Cycle de vie des œuvres

- Statut : Terminé
- Résultat : création, édition, publication, masquage, archivage, restauration, suppression contrôlée et audit.

#### Carte ART-03 — Licences d’utilisation

- Statut : Terminé
- Résultat : licences personnelle, commerciale et exclusive, contraintes métier et couverture QA.

#### Carte ART-04 — Protection des médias

- Statut : Terminé
- Résultat : aperçu protégé, filigrane, métadonnées, accès HD après achat et mesures anti-copie raisonnables.

#### Carte ART-05 — Tableaux de bord artiste

- Statut : Terminé
- Résultat : ventes, revenus, œuvres et demandes de retrait.

### Lot — Commerce et Stripe

#### Carte PAY-01 — Panier et réservation de stock

- Statut : Terminé
- Résultat : panier persistant, contrôle des quantités et réservation lors du checkout.

#### Carte PAY-02 — Paiement Stripe sécurisé

- Statut : Terminé dans le code
- Résultat : checkout, idempotence, webhook signé, transitions financières et reprise après incident.

#### Carte PAY-03 — Moyens de paiement enregistrés

- Statut : Terminé
- Résultat : consentement explicite, enregistrement et suppression côté Stripe.

#### Carte PAY-04 — Commandes, factures et livraison

- Statut : Terminé
- Résultat : historique, facture numérotée, droits numériques et téléchargement sécurisé.

#### Carte PAY-05 — Remboursements, litiges et rapprochement

- Statut : Terminé
- Résultat : actions admin, audit, alertes, rapprochement et procédures opérateur.

### Lot — Coinbase CDP et Base

#### Carte WAL-01 — Intégrer le SDK Coinbase CDP

- Statut : Terminé
- Résultat : chargement client isolé, configuration Nuxt et dépendances compatibles.

#### Carte WAL-02 — Consentement et création idempotente

- Statut : Terminé
- Résultat : activation volontaire après e-mail vérifié, états de création, timeout, échec et relance sûre.

#### Carte WAL-03 — Authentification personnalisée

- Statut : Terminé dans le code
- Résultat : JWKS public, JWT utilisateur et liaison au projet CDP.
- Reste externe : valider les valeurs exactes dans le projet de production.

#### Carte WAL-04 — Gestion du wallet

- Statut : Terminé
- Résultat : adresse publique, réseau Base, BaseScan et export sécurisé de la clé via l’interface Coinbase.

### Lot — Administration

#### Carte ADM-01 — Administration métier

- Statut : Terminé
- Résultat : utilisateurs, artistes, candidatures, œuvres, catégories, commandes et paramètres.

#### Carte ADM-02 — Supervision financière

- Statut : Terminé
- Résultat : paiements, remboursements, litiges, retraits, alertes et journal d’audit.

#### Carte ADM-03 — Analytics administrateur

- Statut : Terminé
- Résultat : indicateurs et vues analytiques intégrées.

## 4. Cartes obligatoires avant validation finale

### Carte BLOCK-01 — Décider et livrer le TOTP

- Colonne : Prêt
- Label : `sécurité`, `critique`
- Objectif : satisfaire la modalité TOTP explicitement demandée dans le sujet, ou obtenir une validation écrite de l’équivalence du code e-mail.
- Checklist :
  - [ ] confirmer l’exigence avec l’encadrant ;
  - [ ] choisir une bibliothèque TOTP maintenue ;
  - [ ] stocker le secret chiffré ;
  - [ ] fournir QR code et codes de récupération ;
  - [ ] protéger activation, validation et désactivation ;
  - [ ] ajouter tests unitaires et d’intégration ;
  - [ ] documenter la récupération de compte.
- Acceptation : un utilisateur peut activer et utiliser un TOTP sans exposer le secret.

### Carte BLOCK-02 — Ajouter une suite E2E navigateur

- Colonne : Prêt
- Label : `frontend`, `backend`, `critique`
- Objectif : couvrir les parcours exigés par le sujet dans un navigateur réel.
- Checklist :
  - [ ] choisir Playwright ou équivalent ;
  - [ ] préparer données et services isolés ;
  - [ ] tester inscription, vérification et connexion ;
  - [ ] tester catalogue, panier et checkout simulé ;
  - [ ] tester candidature artiste et publication ;
  - [ ] tester administration essentielle ;
  - [ ] intégrer la suite au workflow CI approprié.
- Acceptation : scénarios reproductibles, sans dépendance à des données personnelles ou secrets live.

### Carte BLOCK-03 — Exécuter tous les tests d’intégration

- Colonne : Validation production
- Label : `backend`, `infra`
- Objectif : exécuter les 43 tests conditionnels dans leur environnement complet.
- Checklist :
  - [ ] fournir PostgreSQL et Redis dédiés ;
  - [ ] configurer les variables de test ;
  - [ ] exécuter les suites sans `skip` ;
  - [ ] corriger ou documenter chaque échec ;
  - [ ] archiver le résultat CI.
- Acceptation : aucun test requis ignoré dans le job de validation finale.

### Carte BLOCK-04 — Auditer WCAG sur les parcours critiques

- Colonne : Validation production
- Label : `accessibilité`
- Checklist :
  - [ ] navigation clavier complète ;
  - [ ] focus visible et ordre logique ;
  - [ ] lecteur d’écran sur formulaires et erreurs ;
  - [ ] contrastes AA ;
  - [ ] zoom à 200 % et responsive ;
  - [ ] audit automatisé axe ou Lighthouse ;
  - [ ] rapport et anomalies résiduelles.
- Acceptation : aucune violation critique ou sérieuse non justifiée.

### Carte BLOCK-05 — Valider Stripe Live

- Colonne : Validation production
- Label : `paiement`, `critique`
- Checklist :
  - [ ] terminer [`docs/PAYMENT_GO_LIVE_CHECKLIST.md`](docs/PAYMENT_GO_LIVE_CHECKLIST.md) ;
  - [ ] vérifier clés, webhook et signatures ;
  - [ ] réaliser un paiement réel de faible montant ;
  - [ ] vérifier commande, facture et téléchargement ;
  - [ ] tester remboursement et rapprochement ;
  - [ ] contrôler journaux et alertes.
- Acceptation : paiement et remboursement traçables de bout en bout.

### Carte BLOCK-06 — Valider Coinbase CDP en production

- Colonne : Validation production
- Label : `wallet`, `critique`
- Checklist :
  - [ ] confirmer le projet `make-it-art-wallet-production` ;
  - [ ] confirmer le domaine autorisé ;
  - [ ] vérifier l’URL JWKS publique ;
  - [ ] aligner issuer, audience et identifiant utilisateur ;
  - [ ] vérifier les clés serveur actives et révoquer les anciennes ;
  - [ ] créer un wallet avec un compte de recette ;
  - [ ] tester relance idempotente, BaseScan et export sécurisé ;
  - [ ] vérifier qu’aucun secret ou clé privée n’est journalisé.
- Acceptation : création et gestion réussies depuis `https://www.makeitart.io`.

### Carte BLOCK-07 — Produire les preuves d’exploitation VPS

- Colonne : Validation production
- Label : `infra`, `sécurité`
- Checklist :
  - [ ] documenter pare-feu, SSH et comptes ;
  - [ ] vérifier TLS, CSP, HSTS et redirections ;
  - [ ] documenter sauvegardes PostgreSQL ;
  - [ ] tester une restauration ;
  - [ ] confirmer rotation des secrets ;
  - [ ] surveiller espace disque et santé des conteneurs ;
  - [ ] documenter rollback et contacts d’incident.
- Acceptation : preuves datées et procédure reproductible.

### Carte BLOCK-08 — Recette finale et dossier de soutenance

- Colonne : Revue
- Label : `documentation`, `critique`
- Checklist :
  - [ ] vérifier README, exigences, roadmap et décisions ;
  - [ ] joindre captures et résultats CI ;
  - [ ] préparer démonstration par rôle ;
  - [ ] préparer matrice sujet/preuve ;
  - [ ] exécuter les smoke tests production ;
  - [ ] noter les limites et choix assumés.
- Acceptation : chaque exigence du sujet pointe vers une preuve ou un écart explicite.

## 5. Ordre recommandé de clôture

### Jalon A — Conformité pédagogique

1. BLOCK-01 TOTP ;
2. BLOCK-02 E2E navigateur ;
3. BLOCK-03 intégration complète ;
4. BLOCK-04 audit WCAG.

### Jalon B — Recette réelle

1. BLOCK-07 exploitation VPS ;
2. BLOCK-05 Stripe Live ;
3. BLOCK-06 Coinbase CDP ;
4. smoke tests transverses.

### Jalon C — Livraison

1. BLOCK-08 dossier final ;
2. tag de version ;
3. déploiement du commit validé ;
4. surveillance post-déploiement ;
5. décision de clôture ou rollback.

## 6. Post-MVP

### Carte NEXT-01 — Stripe Connect

- Automatiser l’onboarding et les reversements artistes.
- Ne pas démarrer avant validation juridique et comptable.

### Carte NEXT-02 — Fiscalité étendue

- TVA internationale, B2B et règles de facturation multi-pays.

### Carte NEXT-03 — Galerie immersive 3D

- Expérience optionnelle, chargée à la demande et compatible avec un mode accessible alternatif.

### Carte NEXT-04 — Actifs blockchain avancés

- NFT, transferts ou fonctionnalités on-chain uniquement après cadrage juridique, sécurité et coûts.

### Carte NEXT-05 — Applications mobiles

- Clients natifs ou multiplateformes réutilisant l’API existante.

## 7. Définition de terminé

Une carte ne passe dans **Terminé** que si :

- l’implémentation et les migrations nécessaires sont présentes ;
- les tests pertinents passent ;
- le lint, le formatage et les audits requis passent ;
- aucun secret n’est ajouté ;
- l’accessibilité et les erreurs sont prises en compte ;
- la documentation concernée est mise à jour ;
- la revue est effectuée ;
- les opérations externes sont accompagnées d’une preuve datée.