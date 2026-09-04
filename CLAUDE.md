# KashFlow — Équipe Jokkoo — YAS Hackathon 48H

## Avant toute action

Lis `docs/PROMPT-CONCEPTION.xml` **en entier**. C'est la source de vérité du projet.
Si tu ne l'as pas lu, tu n'écris pas de code.

Les blocs `<decisions_verrouillees>`, `<contrat_partage>` et `<design_tokens>` ne se
discutent pas, ne se réinterprètent pas et ne s'améliorent pas. Une contradiction détectée
se signale à l'humain — elle ne s'arbitre pas toute seule.

## Ton rôle

Il t'est donné au lancement de la session : AGENT_UI, AGENT_FRONT, AGENT_BACK ou AGENT_DASH.
Tu n'exécutes que le bloc `<role>` correspondant.

**Tu n'édites que les fichiers listés dans le `<possede>` de ton rôle.** Aucune exception,
même pour une correction évidente d'une ligne dans un fichier voisin. Tu ouvres une demande
dans `docs/handoff/` et tu passes à autre chose.

## Structure du dépôt

```
/app         application acheteur — Expo + expo-router (mobile et web)
/dashboard   application professionnelle — Vite + React (web)
/backend     API — FastAPI + SQLModel + PostgreSQL
/shared      tokens de design et types d'API, partagés par les deux fronts
/docs        prompt de conception, specs de design, handoff
```

## Règles transverses

- Aucune valeur hexadécimale ni taille de police en dur hors de `/shared/theme/tokens.ts`.
- Aucun calcul de prix côté client. Le front affiche ce que l'API renvoie.
- Aucune bibliothèque UI tierce.
- Aucun test en Phase 1 et 2. Les tests sont la Phase 3.
- Aucune fonctionnalité absente de `<perimetre>`, même si « ça ne prend que 10 minutes ».
- Pas de refactorisation du code d'un autre agent.

## Git

Branches : `back/*`, `front/*`, `ui/*`, `dash/*`. Un seul intégrateur merge vers `main`,
toutes les deux heures maximum. Commits petits, fréquents, en français, conventionnels :
`feat(back): join transactionnel`.

## Communication

- Changements de contrat → `docs/handoff/contract-changes.md` (versionné, propriétaire : AGENT_BACK)
- Demandes de composants UI → `docs/handoff/ui-requests.md` (versionné)
- Journal d'avancement et blocages entre agents → `docs/handoff/journal.md` (versionné)
- Échanges humains, logistique, moral → hors dépôt, sur le canal de l'équipe

Les sessions Claude Code tournent sur des machines distinctes et ne lisent aucun canal
externe : le dépôt est leur seul support de synchronisation. Le canal d'équipe reste
celui des humains.

## Franchise

Si une instruction de ce dépôt est techniquement mauvaise ou infaisable dans le temps imparti,
dis-le en une phrase et propose l'alternative. Ne produis pas de code que tu sais bancal pour
respecter le brief.
