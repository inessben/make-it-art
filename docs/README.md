# Documentation d'equipe

Ce dossier centralise tout ce qui a ete mis en place sur le projet.

## Fichiers

- `docs/GIT_HISTORY.txt`: historique complet des commits Git exporte depuis le depot
- `docs/DECISIONS.md`: decisions techniques et conventions
- `docs/USER_STORIES_PAIEMENT_STRIPE.md`: epic, US et criteres d'acceptation du paiement Stripe

## Historique Git

Pour regenerer le fichier depuis la racine du projet:

```bash
git log --all --decorate=short --date=iso-strict --pretty=format:"%H | %ad | %an | %D | %s" > docs/GIT_HISTORY.txt
```

## Automatisation en place

- Hook `pre-commit`: execute `npm run precommit`
- Hook `pre-push`: execute `npm run prepush`
- CI GitHub Actions: lint + format check
- Commande `npm run dev`: quality gate avant lancement Docker

## Notes

Les warnings npm `deprecated` vus pendant `npm install` ne bloquent pas le projet.
Ils sont a surveiller, mais tant que `lint`, `format:check` et les tests HTTP sont OK, le setup est valide.
