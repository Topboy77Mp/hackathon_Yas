# KashFlow — Jokkoo

Plateforme d'achat groupé. Plus le volume monte, plus le prix unitaire baisse.
YAS Hackathon 48H — 04/05 septembre 2026, UNIPOD, Université de Lomé.

## Démarrage

    git clone <url> && cd kashflow
    cp .env.example .env        # renseigner DATABASE_URL et GROQ_API_KEY

Backend :   cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
            python seed.py --reset   # obligatoire : injecte le jeu de démo, rejouable à volonté
            uvicorn main:app --reload
Acheteur :  cd app && cp .env.example .env && npm install && npx expo start   (touche w pour le web)
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

## Tester l'application sur un téléphone

Sur un appareil, `localhost` désigne **le téléphone lui-même**, pas la machine de
développement. Deux choses à faire :

1. **Exposer l'API sur le réseau local** — par défaut uvicorn n'écoute que sur
   `127.0.0.1`, injoignable depuis un téléphone :

       uvicorn main:app --host 0.0.0.0 --port 8000

   Le téléphone et la machine doivent être sur le même Wi-Fi.

2. **Indiquer l'adresse à l'application.** En Expo Go ou build de développement,
   rien à faire : elle la déduit de l'hôte Metro auquel elle est déjà connectée.
   Pour un **APK autonome**, c'est obligatoire — il n'y a plus de serveur Metro :

       # app/.env, avant le build
       EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:8000

   Si l'application vise `localhost` sur un appareil, elle le dit explicitement
   dans son message d'erreur plutôt que d'afficher « connexion impossible ».

## Pour les agents Claude Code

Lire `CLAUDE.md`, puis `docs/PROMPT-CONCEPTION.xml`.
Message de lancement de chaque session : `docs/SESSION-PROMPTS.md`.
