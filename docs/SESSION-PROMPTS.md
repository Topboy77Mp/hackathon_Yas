# Messages de lancement des sessions Claude Code

À copier tel quel dans le premier message de chaque session, après `git clone` et `claude`.
Un ordinateur = une session = un rôle. On ne mélange pas deux rôles dans une même session.

---

## Ordinateur 1 — AGENT_UI

```
Lis docs/PROMPT-CONCEPTION.xml en entier avant toute action.

Tu es AGENT_UI. Exécute le bloc <role id="UI">, Phase 1A uniquement.

Ordre imposé :
1. /shared/theme/tokens.ts — toute la palette, l'échelle d'espacement, les rayons,
   les durées d'animation. Constantes typées, aucune dépendance React Native ni DOM.
2. /docs/design/screens.md — wireframe ASCII, hiérarchie visuelle, états et libellés
   exacts de l'ÉCRAN GROUPE uniquement. Les autres écrans viennent après validation.

Tu n'écris aucun composant tant que ces deux fichiers ne sont pas validés par l'humain.
Tu ne touches à aucun fichier hors de ton <possede>.
```

---

## Ordinateur 2 — AGENT_FRONT

```
Lis docs/PROMPT-CONCEPTION.xml en entier avant toute action.

Tu es AGENT_FRONT. Exécute le bloc <role id="FRONT">, Phase 1A uniquement.

Ordre imposé :
1. Initialisation du projet Expo avec expo-router à la racine (/app).
2. /shared/api/types.ts — un type TypeScript par payload du bloc <contrat_partage>,
   en commençant par GroupDetail, au champ près.
3. Fixtures mockées de GroupDetail, ProductDetail et des KPI, derrière un flag USE_MOCKS.
4. Squelette de routes : toutes les routes existent et naviguent, écrans stub.

Tu ne branches aucun appel API réel en Phase 1A. Tu travailles sur mocks.
Tu ne touches à aucun fichier hors de ton <possede>.
```

---

## Ordinateur 3 — AGENT_BACK

```
Lis docs/PROMPT-CONCEPTION.xml en entier avant toute action.

Tu es AGENT_BACK. Exécute le bloc <role id="BACK">, Phase 1A uniquement.

Ordre imposé :
1. /backend/pricing.py — fonction pure de calcul de palier + calcul des économies.
   Aucune base de données, aucun FastAPI, aucune I/O. C'est le premier fichier du projet.
2. Modèles SQLModel conformes au <contrat_partage>, script de création, script de seed
   avec le jeu de données de démo (engrais NPK, groupe Producteurs de Kovié à 146 sacs).
3. OpenAPI du seul endpoint GET /groups/{id}, payload GroupDetail complet.

Tu es propriétaire du contrat d'API : toute divergence entre l'OpenAPI et le
<contrat_partage> est un incident, tu la signales immédiatement.
Tu ne touches à aucun fichier hors de /backend.
```

---

## Ordinateur 4 — AGENT_DASH (optionnel)

À ne lancer que si une quatrième personne est disponible. Sinon le dashboard est absorbé
par AGENT_FRONT en Phase 2, page Impact d'abord.

```
Lis docs/PROMPT-CONCEPTION.xml en entier avant toute action.

Tu es AGENT_DASH. Exécute le bloc <role id="DASH">, Phase 1A uniquement.

Ordre imposé :
1. Projet Vite + React + TypeScript dans /dashboard, react-router, layout à en-tête marine.
2. Import vérifié de /shared/theme/tokens.ts — tu ne redéfinis aucune couleur.
3. Page Impact sur fixtures mockées : économies générées en display 44, puis les
   compteurs secondaires. Lisible depuis le fond d'une salle sur vidéoprojecteur.

Tu ne touches à aucun fichier hors de ton <possede>.
```

---

## Gate de fin de Phase 1A

Personne ne passe en Phase 2 avant que l'humain ait relu les livrables des trois sessions
et prononcé le gel du contrat. Un contrat qui bouge en silence à l'heure 30 coûte plus cher
que la fonctionnalité qu'il apportait.
