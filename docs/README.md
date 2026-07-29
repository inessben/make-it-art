# Documentation Make It Art

Ce dossier contient les documents spécialisés. Les informations générales, les exigences et la roadmap restent à la racine pour être visibles dès l’ouverture du dépôt.

## Référentiels principaux

| Document | Rôle |
| --- | --- |
| [`../README.md`](../README.md) | présentation, architecture, démarrage et commandes |
| [`../REQUIREMENTS_DOCUMENT.md`](../REQUIREMENTS_DOCUMENT.md) | cahier des exigences et matrice de conformité |
| [`../ROADMAP_TRELLO.md`](../ROADMAP_TRELLO.md) | cartes terminées, blocages et jalons |
| [`DECISIONS.md`](DECISIONS.md) | décisions d’architecture et leurs conséquences |
| [`GIT_HISTORY.txt`](GIT_HISTORY.txt) | historique complet des commits Git exporté depuis le dépôt |

## Historique Git

Pour régénérer l'historique depuis la racine du projet :

```bash
git log --all --decorate=short --date=iso-strict --pretty=format:"%H | %ad | %an | %D | %s" > docs/GIT_HISTORY.txt
```

## Paiements et commerce

| Document | Rôle |
| --- | --- |
| [`USER_STORIES_PAIEMENT_STRIPE.md`](USER_STORIES_PAIEMENT_STRIPE.md) | récits utilisateurs et périmètre Stripe |
| [`GUIDE_QA_STRIPE_PAS_A_PAS.md`](GUIDE_QA_STRIPE_PAS_A_PAS.md) | ordre de recette manuel et commandes détaillées |
| [`PAYMENT_TEST_PATHS.md`](PAYMENT_TEST_PATHS.md) | référence des chemins et scénarios techniques |
| [`PAYMENT_SECURITY_OPERATIONS.md`](PAYMENT_SECURITY_OPERATIONS.md) | sécurité, incidents et exploitation des paiements |
| [`PAYMENT_GO_LIVE_CHECKLIST.md`](PAYMENT_GO_LIVE_CHECKLIST.md) | conditions de passage de Stripe en mode Live |
| [`PAYMENT_METHODS_QA.md`](PAYMENT_METHODS_QA.md) | recette des moyens de paiement enregistrés |

Le guide pas à pas est le point d’entrée QA. `PAYMENT_TEST_PATHS.md` reste une référence technique complémentaire et non une seconde checklist de mise en production.

## Œuvres et licences

| Document | Rôle |
| --- | --- |
| [`ARTWORK_LICENCES_QA.md`](ARTWORK_LICENCES_QA.md) | matrice de recette des licences et règles métier |

Les exigences générales sur le cycle de vie, la protection et la livraison des œuvres sont dans le cahier des exigences.

## Wallet et blockchain

| Document | Rôle |
| --- | --- |
| [`blockchain/README.md`](blockchain/README.md) | source de vérité : architecture, configuration, parcours et production |
| [`blockchain/analysis.md`](blockchain/analysis.md) | historique technique détaillé de l’intégration réalisée |

Les anciens plans quotidiens et notes préparatoires ont été fusionnés dans le README blockchain afin d’éviter plusieurs versions concurrentes.

## Règles documentaires

- mettre à jour la source de vérité existante au lieu de créer un doublon ;
- dater les résultats de test et ne pas les présenter comme une garantie permanente ;
- distinguer le code terminé d’une configuration ou validation externe ;
- ne jamais copier de secret, clé, jeton ou contenu de fichier `.env` ;
- utiliser des liens relatifs vérifiables ;
- archiver uniquement un document qui garde une valeur historique claire ;
- consigner les décisions structurantes dans `DECISIONS.md`.

## Ordre de lecture conseillé

1. [`../README.md`](../README.md) ;
2. [`../REQUIREMENTS_DOCUMENT.md`](../REQUIREMENTS_DOCUMENT.md) ;
3. [`../ROADMAP_TRELLO.md`](../ROADMAP_TRELLO.md) ;
4. le guide spécialisé correspondant à la tâche ;
5. [`GIT_HISTORY.txt`](GIT_HISTORY.txt) pour la chronologie complète des commits.
