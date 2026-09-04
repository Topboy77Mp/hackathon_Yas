# Spécification de mouvement — Passage de palier

L'unique animation non déclenchée par l'utilisateur de toute l'application (cf.
`<moment_unique>`, `docs/PROMPT-CONCEPTION.xml`). Durée totale 900 ms, une fois par
franchissement, jamais en boucle, jamais rejouée sur un simple refresh sans changement.

Déclencheur : `current_tier.min_quantity` change entre deux réponses de polling
`GET /groups/{id}` (détecté par `useGroupPolling`, cf. `app/lib/hooks/useGroupPolling.ts`).

## Séquence (0 → 900 ms)

| t (ms) | Élément | Comportement |
|---|---|---|
| 0 | Barre de progression | Démarre son animation de largeur vers la nouvelle valeur de `progress_ratio`. Durée 400 ms, easing standard (ease-out). |
| 0 | Compteur (participants / quantité) | Démarre le comptage de l'ancienne à la nouvelle valeur. Durée 500 ms, incrément linéaire, chiffres tabulaires (pas de saut de largeur). |
| 500 | Prix | L'ancien prix (texte barré, `text.muted`) apparaît en fondu à côté du prix actuel. |
| 500–900 | Prix | L'ancien prix glisse légèrement vers le bas et s'estompe (translateY + opacity) pendant que le nouveau prix change de couleur : `brand.ink` → `unlock.green` sur 400 ms, puis revient à `brand.ink` après une pause de lecture (géré par l'écran, pas par le composant : cf. `unlockBanner` dans `GroupScreen`, affiché 4 s). |
| 900 | — | Fin de la séquence. Aucune répétition. |

Ordre volontaire : la barre et le compteur bougent d'abord (ce qu'on observe en direct
pendant que les commandes arrivent), le prix change ensuite (la conséquence). Montrer la
cause avant la conséquence rend l'animation lisible sans explication.

## Ce qui NE bouge PAS

- Aucun élément de la zone sous la ligne de flottaison (description produit, ma
  participation) ne s'anime.
- Le bouton d'action ne change pas de position ni de taille.
- Le bandeau « Palier débloqué » (fond `unlock.green.soft`) apparaît sans animation
  d'entrée (fondu géré nativement par son montage/démontage React, pas de spring ni de
  bounce) et disparaît après 4 s sans transition travaillée — ce n'est pas l'élément qui
  porte l'attention, le prix l'est.

## Propriétés animées, composant par composant

- **ProgressBar** (`app/components/ui/ProgressBar.tsx`) : anime `width` (pourcentage) sur
  `motion.progressBarFillMs` (400 ms) à chaque changement de `value`, y compris hors
  contexte de déblocage (un simple refetch qui fait progresser la barre s'anime aussi,
  discrètement — c'est le même mécanisme, pas un cas spécial).
- **CounterDisplay** (`app/components/ui/CounterDisplay.tsx`) : anime la valeur affichée
  de l'ancienne à la nouvelle sur `motion.counterIncrementMs` (500 ms) à chaque
  changement de `value`.
- **PriceDisplay** (`app/components/ui/PriceDisplay.tsx`) : ne s'anime QUE si on lui passe
  `highlightChange`. Sur `motion.priceSwapDelayMs` (500 ms) de délai puis
  `motion.priceSwapMs` (400 ms) de transition : fondu + léger déplacement de l'ancien
  prix barré, couleur du nouveau prix qui bascule vers `unlock.green`.

Cette séparation des responsabilités est volontaire : chaque composant sait animer SA
propre valeur ; c'est l'écran (`GroupScreen`, propriété d'AGENT_FRONT) qui décide QUAND
`highlightChange` vaut vrai, en comparant `current_tier` entre deux réponses.

## Ce qui est interdit

- Aucune autre entrée en fondu dans l'application (listes, cartes, écrans).
- Aucun effet de survol animé, aucune ombre portée animée, aucun effet de carte au clic.
- Pas de rebond (spring/bounce) : easing standard uniquement, pour rester sobre et
  lisible sur un vidéoprojecteur ou un téléphone d'entrée de gamme.
