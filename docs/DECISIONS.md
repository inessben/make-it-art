# Decisions techniques

## 1) Docker Compose dans `infrastructure/`

Decision: le fichier compose reste dans `infrastructure/docker-compose.yml`.

Raison: separer clairement le code applicatif (`frontend/`, `backend/`) et l'infra (`infrastructure/`).

## 2) Variables d'environnement

Decision: source unique pour Docker local = `infrastructure/.env`.

Raison: eviter les conflits entre plusieurs `.env` au demarrage compose.

## 3) Health endpoints

Decision: endpoint backend `/health` + proxy `/api/health` via Nginx.

Raison: verification rapide du service en local et en CI/CD.

## 4) Quality gate

Decision: lint + format check obligatoires avant commit/push et avant `npm run dev`.

Raison: garantir un code propre et homogene dans l'equipe.

## 5) CI

Decision: CI sur `develop` et PR vers `develop/main`.

Raison: bloquer les regressions avant merge.
