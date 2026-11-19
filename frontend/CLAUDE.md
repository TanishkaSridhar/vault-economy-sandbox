# VAULT frontend — rules for Claude

Master brief: `docs/PLAN.md`. Work ONLY in `/frontend` and `/docs`, on the `frontend` branch.

## Hard rules (never break) — from docs/PLAN.md section 0

- Never modify `src/`, `pom.xml`, `mvnw*`, `.mvn`, `schema.sql`, scenarios, tests or anything outside `/frontend` and `/docs`. The only allowed exception is adding git-ignore entries.
- `vault.db` and the scenario JSONs are READ-ONLY. The bridge opens `vault.db` with `readonly: true`.
- Never read, print or expose `.env` or any API key. No external API calls from the frontend at all (no LLM calls, no CDNs for data).
- If a feature seems to need a backend change, find a workaround in `/frontend/server` or ask first.
- Before every commit run the check below and confirm it prints nothing:

  ```sh
  git diff --name-only | grep -v '^frontend/\|^docs/'
  ```

## Workflow reminders (docs/PLAN.md section 11)

- Never merge or push. At the end, give the exact commands to review and merge.
- Do not rewrite working components; extend with the smallest possible change.
