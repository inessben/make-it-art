# Documentation d'equipe

Ce dossier centralise tout ce qui a ete mis en place sur le projet.

## Fichiers

- `docs/TEAM_LOG.md`: journal des changements (obligatoire apres chaque session)
- `docs/TEAM_LOG_TEMPLATE.md`: template d'entree a copier
- `docs/DECISIONS.md`: decisions techniques et conventions

## Regle simple

Apres chaque session de travail:

1. Ajoute une entree dans `docs/TEAM_LOG.md`
2. Indique les fichiers modifies
3. Indique comment tu as verifie
4. Indique la prochaine etape et les blocages

## Automatisation en place

- Hook `pre-commit`: execute `npm run precommit`
- Hook `pre-push`: execute `npm run prepush`
- CI GitHub Actions: lint + format check
- Commande `npm run dev`: quality gate avant lancement Docker

## Notes

Les warnings npm `deprecated` vus pendant `npm install` ne bloquent pas le projet.
Ils sont a surveiller, mais tant que `lint`, `format:check` et les tests HTTP sont OK, le setup est valide.
