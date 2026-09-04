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

**Entrée corrigée par celle du 11:44 ci-dessous.**

---

## [11:44] IA-2 réduite au français + modèle Groq revu

Avant : IA-2 génère 3 variantes en français, éwé et mina. Modèle `openai/gpt-oss-120b`.
Après : IA-2 génère des variantes en français uniquement. Modèle `qwen/qwen3.8-27b`.

Raison : l'orchestrateur a retiré l'éwé et le mina du périmètre obligatoire. Cela
annule le seul argument qui justifiait `gpt-oss-120b` dans l'entrée de 11:36.

Correction d'une erreur d'analyse de l'entrée précédente : il y était écrit que
`qwen` gardait le palier 1 au prix de détail là où `gpt-oss` le bradait. Vérification
sur 3 tirages par modèle avec un prompt plus court : **les deux bradent le palier 1 à
20 900**. C'était de la variance de prompt, pas une différence de modèle. Les deux
respectent les invariants 3 fois sur 3 et produisent des grilles identiques
(20 900 / 19 800 / 18 700 / 16 500).

Seul écart réel restant : la latence. `qwen/qwen3.8-27b` tourne à 1,1–1,6 s contre
1,9–2,5 s, soit davantage de marge sous le timeout de 4 s. C'est le critère retenu.

À retenir pour l'implémentation d'IA-1 : le prompt devra imposer explicitement que le
premier palier vaut le prix de détail, sinon les deux modèles le bradent. À défaut,
`validate_tiers` ne le rattrapera pas — cet invariant n'est pas dans le contrat.

Impacte : AGENT_DASH (le formulaire de partage n'a plus de sélecteur de langue).
Aucun payload d'API modifié.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [11:47] Canal de journal — contradiction `CLAUDE.md` / `PROMPT-CONCEPTION.xml`

Avant : `CLAUDE.md` plaçait le journal d'avancement **hors dépôt**, sur le canal de
l'équipe, tandis que `<collaboration>/<journal>` du prompt de conception impose
`docs/handoff/journal.md` versionné, « seul canal de synchronisation asynchrone entre
les sessions ». Les deux instructions se contredisaient frontalement.

Après : `docs/handoff/journal.md` est créé et devient le journal **entre agents**.
Le canal d'équipe reste celui des **humains** (logistique, moral, arbitrages).
`CLAUDE.md` est corrigé en conséquence.

Raison : arbitrage rendu par l'orchestrateur, appliqué par AGENT_BACK. Le prompt de
conception prime — `CLAUDE.md` le désigne lui-même comme source de vérité. Argument
décisif : les sessions Claude Code tournent sur des machines distinctes et ne lisent
aucun canal externe. Le dépôt est leur seul support commun ; un journal hors dépôt ne
synchronise donc rien du tout entre agents. La distinction tient au destinataire, pas
au média : le XML parle de synchronisation entre *sessions*, `CLAUDE.md` parlait du
suivi *humain*.

Également corrigé dans le même mouvement : `/.env.example` remplace `ANTHROPIC_API_KEY`
par `GROQ_API_KEY` + `GROQ_MODEL`, en cohérence avec l'entrée de 11:36. Ce fichier et
`CLAUDE.md` sont hors du `<possede>` d'AGENT_BACK : les deux modifications ont été
faites sur instruction explicite de l'orchestrateur.

Impacte : tous les agents — `CLAUDE.md` a changé, à relire.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [15:20] Ajout de `GET /notifications` et `POST /notifications/{id}/read`

Avant : le bloc `<endpoints>` ne prévoyait aucune route de notification.
Après : deux routes ajoutées.

    GET  /notifications              → {unread_count, notifications[]}
    POST /notifications/{id}/read    → NotificationOut

Raison : le backend écrivait déjà des lignes `Notification` au franchissement de
palier et à l'annulation d'un groupe — 56 lignes en base au moment du constat —
sans qu'aucune route permette de les lire. Le badge in-app était donc impossible
à afficher. Le bloc `<exclus>` du contrat écarte le push mais retient
explicitement « une liste de notifications en base + badge in-app suffit » : la
moitié en base existait, la moitié lisible manquait. Ces deux routes ferment la
boucle sans rien ajouter au périmètre fonctionnel.

Forme du payload NotificationOut : `{id, type, title, message, read, created_at}`.
Types émis à ce jour : `TIER_UNLOCKED`, `GROUP_CANCELLED`.

Une notification appartenant à un autre utilisateur renvoie 404 et non 403 : on
ne révèle pas son existence.

Impacte : AGENT_FRONT (badge et liste in-app). AGENT_DASH n'est pas concerné.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [15:20] `require_group_creator` conservé sans consommateur — pour mémoire

Ceci n'est pas un changement de contrat mais la trace d'un arbitrage.

`auth.py` définit `require_group_creator`, qu'aucun endpoint n'utilise : la liste
gelée ne contient aucune action réservée au créateur d'un groupe. AGENT_BACK avait
d'abord recommandé de le retirer comme code mort. C'était une erreur : l'étape 3
de `<ordre_de_travail_impose>` le liste nommément parmi les livrables, au même
titre que `current_user` et `require_merchant`. Le supprimer aurait violé le
contrat pour des raisons d'esthétique de code.

Décision : la dépendance reste en place, prête à servir si une action de créateur
de groupe est ajoutée plus tard (clôture anticipée par exemple). Aucune route
n'est créée pour la justifier — le contrat interdit d'ajouter une fonctionnalité
hors périmètre.

---
