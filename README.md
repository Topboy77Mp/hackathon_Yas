# KashFlow — Jokkoo

Plateforme d'achat groupé. Plus le volume monte, plus le prix unitaire baisse.
YAS Hackathon 48H — 04/05 septembre 2026, UNIPOD, Université de Lomé.

## Démarrage

    git clone <url> && cd kashflow
    cp .env.example .env        # renseigner DATABASE_URL et GROQ_API_KEY

Backend :   cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            python seed.py --reset   # obligatoire : injecte le jeu de démo, rejouable à volonté
            uvicorn main:app --reload
Acheteur :  npx expo start          (touche w pour la cible web)
Dashboard : cd dashboard && npm install && npm run dev

La base PostgreSQL doit exister au préalable :

    sudo -u postgres psql -c "CREATE ROLE kashflow LOGIN PASSWORD 'kashflow';" \
                          -c "CREATE DATABASE kashflow OWNER kashflow;"

API : http://localhost:8000 · doc interactive /docs · contrat figé backend/openapi.json
Compte de démo : +22891000001 / demo1234 · groupe de démo /groups/code/KOVIE

## Pour les agents Claude Code

Lire `CLAUDE.md`, puis `docs/PROMPT-CONCEPTION.xml`.
Message de lancement de chaque session : `docs/SESSION-PROMPTS.md`.
