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

## Comptes de démonstration

| Rôle       | Téléphone     | Mot de passe |
|------------|---------------|--------------|
| Acheteur   | +22891000001  | demo1234     |
| Commerçant | +22890000001  | demo1234     |

Groupe de démonstration : `/groups/code/KOVIE` — 146 sacs sur 200, 19 000 FCFA,
il en manque 54 pour tomber à 17 500.

### Faire monter le compteur pendant la démonstration

    curl -X POST localhost:8000/demo/simulate-joins \
         -H 'X-Demo-Token: jokkoo-demo' -H 'Content-Type: application/json' \
         -d '{"group_id":1,"count":18,"quantity":3}'

`python seed.py --reset` remet la démonstration à son état de départ, autant de
fois que nécessaire.

## Pour les agents Claude Code

Lire `CLAUDE.md`, puis `docs/PROMPT-CONCEPTION.xml`.
Message de lancement de chaque session : `docs/SESSION-PROMPTS.md`.
