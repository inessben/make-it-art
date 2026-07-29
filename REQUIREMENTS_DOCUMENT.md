# Cahier des exigences — Make It Art

## 1. Statut du document

- Version : 3.0
- Dernière mise à jour : 29 juillet 2026
- Statut : référentiel vivant aligné sur le dépôt et l’historique Git
- Source pédagogique : [`tmp_sujet_web.txt`](tmp_sujet_web.txt)
- Périmètre : frontend, backend, données, paiements, wallet, sécurité, accessibilité et exploitation

Ce document distingue les fonctions présentes dans le dépôt des points restant à valider. Les statuts employés sont : **Terminé**, **Partiel**, **À faire** et **Externe**.

## 2. Vision et objectifs

Make It Art est une marketplace d’art numérique permettant :

- aux visiteurs de découvrir des œuvres et des artistes ;
- aux membres d’acheter, télécharger et gérer des œuvres numériques ;
- aux artistes de candidater, publier, licencier et suivre leurs ventes ;
- aux administrateurs de modérer le catalogue et superviser les opérations ;
- aux utilisateurs volontaires de créer un portefeuille intégré sur Base.

Le produit doit proposer une expérience utilisable au clavier, compatible avec les technologies d’assistance, sécurisée, traçable et exploitable en environnement Docker.

## 3. Acteurs

| Acteur | Responsabilités principales |
| --- | --- |
| Visiteur | parcourir le catalogue, consulter les artistes et créer un compte |
| Membre | gérer son profil, ses favoris, son panier, ses achats et son wallet |
| Artiste | gérer sa candidature, son contrat, ses œuvres, ses ventes et retraits |
| Administrateur | modérer, administrer, auditer et traiter les incidents commerciaux |
| Opérateur | déployer, sauvegarder, surveiller et restaurer la plateforme |

## 4. Exigences fonctionnelles

### 4.1 Authentification et compte

| ID | Exigence | Statut | Preuve principale |
| --- | --- | --- | --- |
| AUTH-01 | Inscription par e-mail avec mot de passe robuste | Terminé | routes d’authentification, validation zxcvbn et tests |
| AUTH-02 | Vérification obligatoire de l’adresse e-mail | Terminé | jetons de vérification et page dédiée |
| AUTH-03 | Connexion et déconnexion sécurisées | Terminé | access token, refresh token et révocation |
| AUTH-04 | Connexion Google OAuth 2.0 | Terminé | routes Google et tests associés |
| AUTH-05 | Mot de passe oublié et réinitialisation | Terminé | flux e-mail avec jetons temporaires |
| AUTH-06 | Protection renforcée lors d’une connexion sensible | Terminé | code de connexion par e-mail et appareil mémorisé |
| AUTH-07 | Authentification TOTP conforme à la formulation exacte du sujet | À faire | aucun fournisseur TOTP confirmé dans le dépôt |
| AUTH-08 | Gestion du profil, des préférences et des consentements | Terminé | pages compte, paramètres et modèle `ConsentRGPD` |
| AUTH-09 | Suppression de compte en libre-service | Hors périmètre actuel | aucun parcours produit requis à ce stade |

### 4.2 Catalogue et interactions sociales

| ID | Exigence | Statut |
| --- | --- | --- |
| CAT-01 | Lister et consulter les œuvres publiées | Terminé |
| CAT-02 | Rechercher et filtrer par artiste, catégorie ou collection | Terminé |
| CAT-03 | Consulter les profils d’artistes et membres | Terminé |
| CAT-04 | Gérer favoris et liste de souhaits | Terminé |
| CAT-05 | Suivre des artistes et recevoir des notifications | Terminé |
| CAT-06 | Gérer des collections personnelles | Terminé |

### 4.3 Parcours artiste et œuvres

| ID | Exigence | Statut |
| --- | --- | --- |
| ART-01 | Déposer une candidature artiste progressive | Terminé |
| ART-02 | Accepter et tracer le contrat artiste | Terminé |
| ART-03 | Faire valider la candidature par un administrateur | Terminé |
| ART-04 | Créer et modifier une œuvre | Terminé |
| ART-05 | Publier, masquer, archiver, restaurer ou supprimer selon les règles métier | Terminé |
| ART-06 | Gérer les conflits de modification et la traçabilité | Terminé |
| ART-07 | Définir une licence personnelle, commerciale ou exclusive | Terminé |
| ART-08 | Protéger les aperçus et livrer le fichier HD uniquement après achat | Terminé |
| ART-09 | Ajouter filigrane et métadonnées de provenance | Terminé |
| ART-10 | Consulter ventes, revenus et demandes de retrait | Terminé |

### 4.4 Panier, commandes et paiement

| ID | Exigence | Statut |
| --- | --- | --- |
| PAY-01 | Ajouter, modifier et retirer des articles du panier | Terminé |
| PAY-02 | Réserver le stock pendant le checkout | Terminé |
| PAY-03 | Créer un paiement Stripe de manière idempotente | Terminé |
| PAY-04 | Vérifier les webhooks Stripe et résister aux doublons | Terminé |
| PAY-05 | Finaliser la commande uniquement depuis un événement fiable | Terminé |
| PAY-06 | Enregistrer un moyen de paiement avec consentement explicite | Terminé |
| PAY-07 | Générer une facture et sécuriser le téléchargement | Terminé |
| PAY-08 | Gérer remboursements, litiges et rapprochement | Terminé |
| PAY-09 | Fournir les vues d’administration et alertes opérateur | Terminé |
| PAY-10 | Valider les clés, URLs, webhooks et scénarios Stripe Live | Externe |

Les exigences détaillées et chemins de test sont documentés dans [`docs/GUIDE_QA_STRIPE_PAS_A_PAS.md`](docs/GUIDE_QA_STRIPE_PAS_A_PAS.md) et [`docs/PAYMENT_SECURITY_OPERATIONS.md`](docs/PAYMENT_SECURITY_OPERATIONS.md).

### 4.5 Portefeuille Coinbase CDP

| ID | Exigence | Statut |
| --- | --- | --- |
| WAL-01 | Utiliser le réseau Base | Terminé |
| WAL-02 | Proposer un wallet intégré non custodial | Terminé |
| WAL-03 | Créer le wallet uniquement après e-mail vérifié et consentement explicite | Terminé |
| WAL-04 | Garantir l’idempotence de création et permettre une relance | Terminé |
| WAL-05 | Afficher l’adresse publique et un lien BaseScan | Terminé |
| WAL-06 | Fournir une exportation sécurisée sans exposer la clé au backend | Terminé |
| WAL-07 | Configurer l’authentification personnalisée JWKS/JWT | Terminé dans le code ; validation production requise |
| WAL-08 | Ne jamais stocker ni journaliser une clé privée utilisateur | Terminé par conception |
| WAL-09 | Valider domaine, projet, clés et flux CDP de production | Externe |

Le document canonique est [`docs/blockchain/README.md`](docs/blockchain/README.md).

### 4.6 Administration et analytique

| ID | Exigence | Statut |
| --- | --- | --- |
| ADM-01 | Administrer utilisateurs, artistes, candidatures et œuvres | Terminé |
| ADM-02 | Administrer catégories, commandes et paramètres | Terminé |
| ADM-03 | Superviser paiements, remboursements, litiges et retraits | Terminé |
| ADM-04 | Journaliser les actions sensibles | Terminé |
| ADM-05 | Fournir tableaux de bord et statistiques | Terminé |
| ANA-01 | Charger Umami seulement après consentement | Terminé |
| ANA-02 | Afficher la bannière tant qu’aucun choix n’a été enregistré | Terminé |
| ANA-03 | Permettre de consulter et modifier le choix de cookies | Terminé |

## 5. Exigences d’interface et d’accessibilité

| ID | Exigence | Statut |
| --- | --- | --- |
| UX-01 | Interface responsive pour mobile, tablette et bureau | Terminé |
| UX-02 | Navigation complète au clavier | Terminé dans le code ; audit manuel final requis |
| UX-03 | Focus visible sur les contrôles interactifs | Terminé |
| UX-04 | Contrastes suffisants selon WCAG AA | Terminé dans le design ; audit instrumenté final requis |
| UX-05 | Labels associés aux champs de formulaire | Terminé |
| UX-06 | Textes alternatifs pertinents sur les images | Terminé |
| UX-07 | Hiérarchie cohérente des titres | Terminé |
| UX-08 | Boutons nommés et ARIA utilisé uniquement si nécessaire | Terminé |
| UX-09 | Messages d’erreur compréhensibles et annoncés | Terminé |
| UX-10 | Audit WCAG final sur les parcours critiques | À faire |

## 6. Architecture et données

### 6.1 Frontend

- Nuxt 4 et Vue 3 ;
- Tailwind CSS 3 et Sass ;
- Pinia pour l’état partagé ;
- rendu hybride Nuxt et intégrations client isolées ;
- SDK Stripe et Coinbase chargés seulement sur les parcours concernés.

### 6.2 Backend

- Node.js 22 et Express ;
- API REST sous `/api` ;
- documentation OpenAPI sous `/api/docs` ;
- Prisma 7 pour l’accès aux données et les migrations ;
- validation, authentification, contrôle d’accès et rate limiting ;
- traitements idempotents pour les opérations financières et wallet.

### 6.3 Données

- PostgreSQL 16 comme source de vérité ;
- Redis 7 pour les mécanismes temporaires et distribués ;
- relations et contraintes gérées par Prisma ;
- historique financier et journal d’audit conservés séparément ;
- 43 migrations validées sur une base neuve lors du contrôle du 29 juillet 2026.

### 6.4 Infrastructure

- Docker Compose pour le développement et la production ;
- Nginx comme proxy local ;
- Caddy comme reverse proxy TLS en production ;
- Umami et sa base dédiée ;
- Mailpit pour les e-mails locaux ;
- secrets injectés par l’environnement, jamais versionnés.

## 7. Sécurité

| ID | Exigence | Statut |
| --- | --- | --- |
| SEC-01 | Hachage moderne des mots de passe | Terminé avec Argon2 |
| SEC-02 | Validation stricte des entrées | Terminé |
| SEC-03 | Autorisation par rôle et propriété | Terminé |
| SEC-04 | Sessions et refresh tokens révocables | Terminé |
| SEC-05 | Rate limiting des routes sensibles | Terminé |
| SEC-06 | Webhooks Stripe authentifiés | Terminé |
| SEC-07 | En-têtes HTTP de sécurité et politique CSP | Terminé dans l’application/proxy ; contrôle production requis |
| SEC-08 | Aucune clé privée wallet transitant par Make It Art | Terminé |
| SEC-09 | Détection de secrets et audit des dépendances | Terminé dans les contrôles du dépôt |
| SEC-10 | Durcissement SSH, pare-feu, mises à jour et comptes du VPS | Externe |
| SEC-11 | Procédure de sauvegarde et restauration testée | Externe |

## 8. Vie privée et conformité

- seuls les cookies strictement nécessaires sont actifs par défaut ;
- Umami est activé après acceptation explicite ;
- l’utilisateur peut refuser les cookies non essentiels ;
- les consentements importants sont horodatés et versionnés ;
- les pages de confidentialité, cookies et conditions sont accessibles ;
- les données et journaux doivent suivre une politique de conservation définie par l’exploitant.

## 9. Qualité, tests et CI/CD

### 9.1 Contrôles présents

- lint ESLint ;
- formatage Prettier ;
- tests unitaires et d’intégration backend ;
- tests frontend ;
- tests QA spécialisés paiements et licences ;
- vérification des migrations Prisma ;
- audits npm et recherche de secrets ;
- construction des images Docker de production ;
- contrôle de santé au déploiement.

### 9.2 Dernière validation documentée

Le 29 juillet 2026 :

- backend : 375 tests réussis sur 375 dans un environnement Linux isolé ;
- frontend : 84 tests réussis sur 84 ;
- migrations : 43 appliquées sur une base neuve ;
- images de production : backend et frontend construites sans cache, puis validées avec les healthchecks de la stack ;
- audit npm backend : aucune vulnérabilité connue ;
- audit npm frontend : aucune vulnérabilité haute ou critique, avec quatre vulnérabilités modérées transitives connues dans la chaîne Coinbase CDP.

### 9.3 Écarts à fermer

| ID | Action | Priorité |
| --- | --- | --- |
| QA-01 | Ajouter des scénarios E2E navigateur reproductibles | Critique avant soutenance |
| QA-02 | Maintenir l’exécution des tests d’intégration sur une base PostgreSQL neuve dans la CI | Haute |
| QA-03 | Produire un rapport d’audit WCAG sur les parcours critiques | Haute |
| QA-04 | Archiver les preuves de smoke tests production | Haute |
| QA-05 | Tester une restauration réelle de sauvegarde | Haute |

## 10. Matrice de conformité au sujet pédagogique

| Exigence de `tmp_sujet_web.txt` | Réalisation actuelle | État |
| --- | --- | --- |
| Nuxt 3 ou supérieur | Nuxt 4 | Conforme |
| Tailwind CSS | Tailwind CSS 3 | Conforme |
| Backend Node.js | Express sur Node.js 22 | Conforme |
| Base SQL | PostgreSQL 16 | Conforme |
| OAuth 2.0 | Google OAuth 2.0 | Conforme |
| TOTP | code de connexion e-mail, mais pas de TOTP confirmé | Non conforme à la modalité exacte |
| Docker développement/production | deux configurations Compose | Conforme |
| CI à chaque push | workflows GitHub Actions | Conforme selon les règles de branches |
| CD après fusion principale | workflow de déploiement | Conforme sous réserve des secrets et du VPS |
| Tests unitaires/intégration/E2E | unitaires et intégration présents ; E2E navigateur à formaliser | Partiel |
| WCAG | corrections globales appliquées ; rapport final attendu | Partiel |
| Consentement cookies | bannière et choix persistant | Conforme |
| Analytics respectueux du consentement | Umami | Conforme |
| Durcissement VPS | responsabilité opérateur | Preuve externe requise |

## 11. Critères de recette avant livraison finale

Une version est livrable lorsque :

1. tous les workflows requis sont verts sur le commit ciblé ;
2. les migrations ont été testées sur une copie ou une base neuve ;
3. aucun secret n’est présent dans le diff ou l’historique récent ;
4. inscription, vérification e-mail, connexion locale et Google fonctionnent ;
5. catalogue, panier, paiement, commande, facture et téléchargement fonctionnent ;
6. candidature artiste, publication d’œuvre et administration fonctionnent ;
7. le wallet se crée uniquement avec consentement et fonctionne dans le projet CDP ciblé ;
8. les choix de cookies sont respectés ;
9. les parcours critiques passent au clavier et avec un lecteur d’écran ;
10. les procédures de retour arrière et de restauration sont disponibles.

## 12. Hors périmètre ou post-MVP

- galerie immersive 3D ;
- création ou vente de NFT ;
- trading ou transfert automatisé d’actifs ;
- Stripe Connect et reversements automatiques ;
- fiscalité internationale avancée ;
- applications mobiles natives ;
- suppression de compte entièrement automatisée tant qu’elle n’est pas priorisée.

## 13. Traçabilité documentaire

- architecture et démarrage : [`README.md`](README.md) ;
- roadmap : [`ROADMAP_TRELLO.md`](ROADMAP_TRELLO.md) ;
- décisions : [`docs/DECISIONS.md`](docs/DECISIONS.md) ;
- historique des commits : [`docs/GIT_HISTORY.txt`](docs/GIT_HISTORY.txt) ;
- paiements : [`docs/GUIDE_QA_STRIPE_PAS_A_PAS.md`](docs/GUIDE_QA_STRIPE_PAS_A_PAS.md) ;
- wallet : [`docs/blockchain/README.md`](docs/blockchain/README.md) ;
- checklist production : [`docs/PAYMENT_GO_LIVE_CHECKLIST.md`](docs/PAYMENT_GO_LIVE_CHECKLIST.md).
