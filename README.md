# KashFlow — Jokkoo

Plateforme d'achat groupé. Plus le volume monte, plus le prix unitaire baisse.
YAS Hackathon 48H — 04/05 septembre 2026, UNIPOD, Université de Lomé.

## Démarrage

    git clone <url> && cd kashflow
    cp .env.example .env        # renseigner DATABASE_URL et ANTHROPIC_API_KEY

Backend :   cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload
Acheteur :  npx expo start          (touche w pour la cible web)
Dashboard : cd dashboard && npm install && npm run dev

## Pour les agents Claude Code

Lire `CLAUDE.md`, puis `docs/PROMPT-CONCEPTION.xml`.
Message de lancement de chaque session : `docs/SESSION-PROMPTS.md`.
