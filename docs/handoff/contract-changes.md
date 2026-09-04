# Changements de contrat

Le contrat (`<contrat_partage>` du prompt de conception) est gelé à la fin de la Phase 1A.
Toute évolution passe par une entrée ici, ET par une notification explicite aux autres
sessions : elles ne relisent jamais un fichier de leur propre initiative.

Propriétaire de ce fichier : AGENT_BACK.

Format :

    ## [HH:MM] Champ ou endpoint concerné
    Avant :
    Après :
    Raison :
    Impacte : AGENT_FRONT / AGENT_DASH
    Notifié : oui / non

---

## [11:36] Fournisseur LLM — `<stack>/<ia>`

Avant : Anthropic API, modèle Claude Sonnet, variable `ANTHROPIC_API_KEY`.
Après : Groq (API compatible OpenAI), modèle `openai/gpt-oss-120b`, variables
`GROQ_API_KEY` + `GROQ_MODEL`, base `https://api.groq.com/openai/v1`.

Raison : décision de l'orchestrateur. Le modèle initialement envisagé côté Groq
(`llama-3.3-70b-versatile`) a été retiré du catalogue — il n'y a plus aucun modèle
de chat Llama disponible, seulement les classifieurs `prompt-guard`. Trois candidats
ont été mesurés sur les tâches réelles IA-1 et IA-2 :

| Modèle | IA-1 paliers | IA-2 multilingue | Invariants |
|---|---|---|---|
| `openai/gpt-oss-120b` | 2,34 s | 2,09 s | respectés |
| `openai/gpt-oss-20b` | 1,32 s | 3,70 s | respectés |
| `qwen/qwen3.8-27b` | 1,07 s | 1,34 s | respectés |

`gpt-oss-120b` retenu : meilleure discipline JSON, seul à différencier réellement
l'éwé du mina, et 2,3 s laisse de la marge sur le timeout de 4 s imposé par la
`<regle_commune>`.

Ce qui NE change pas : D7 (aucun appel LLM sur le chemin critique de la démo),
le timeout de 4 s, l'obligation de fallback déterministe intégral sans clé, et le
fait que la clé ne quitte jamais `/backend`. Aucun payload d'API n'est modifié :
`POST /ai/suggest-tiers` et `POST /ai/share-message` gardent leurs contrats.

Impacte : personne côté payload. AGENT_DASH pour mémoire (le bouton « Proposer des
paliers » consomme le même endpoint). `/.env.example` doit remplacer
`ANTHROPIC_API_KEY` par `GROQ_API_KEY` + `GROQ_MODEL` — fichier hors du `<possede>`
d'AGENT_BACK, laissé à l'orchestrateur.

Réserve ouverte : la qualité de l'éwé et du mina n'est vérifiée par personne. À faire
relire par un locuteur avant le pitch.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---
