# Team Log

Chaque membre ajoute une entree apres son travail.

## Entrees

### 2026-03-15 - Mimi

- Branche: `develop`
- Tache: Bootstrap monorepo et infra locale
- Fichiers modifies:
  - `frontend/*`
  - `backend/*`
  - `infrastructure/*`
  - `.github/workflows/*`
- Impact: Projet lancable en local avec Docker + Nginx
- Verification:
  - `curl -i http://localhost:4000/health` -> 200
  - `curl -i http://localhost/api/health` -> 200
  - `curl -I http://localhost` -> 200
- Prochaine etape: Repartition des features en branches `feature/*`
- Blocages: Aucun

---

Ajoute les nouvelles entrees au-dessus de cette ligne.
