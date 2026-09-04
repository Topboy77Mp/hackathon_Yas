# Spécification d'écran — Écran groupe

Phase 1A — AGENT_UI. Seul cet écran est spécifié avant validation humaine (cf. `docs/SESSION-PROMPTS.md`).
Les autres écrans (`accueil`, `fiche produit`, `rejoindre`, `confirmation`, `partager`, `mes groupes`,
`mes commandes`, `profil`, `groupe en vue publique`, écrans `/dashboard`) suivent après le gel de ce document.

Source de données : payload `GroupDetail` (`docs/PROMPT-CONCEPTION.xml`, `<contrat_partage>`). Cet écran
se dessine intégralement à partir de ce payload, sans second appel, sans calcul local (D3).

Jeu de données de référence utilisé dans les wireframes : groupe « Producteurs de Kovié », engrais NPK
15-15-15, 38 participants, 146/200 sacs, prix actuel 19 000 F, palier suivant à 200 sacs → 17 500 F.

---

## Hiérarchie visuelle

Du plus important au moins important, dans l'ordre où l'œil doit tomber :

1. **Prix actuel** — `display 44/48`, Archivo 700, chiffres tabulaires. C'est le plus gros élément de
   l'écran, sans exception.
2. **Barre de progression** — juste sous le prix. Seule zone jaune de l'écran hors bouton d'action.
3. **Ce qu'il manque** — une phrase courte, `heading 20/26`, langage utilisateur (« il manque 54 sacs »).
4. **Prochain palier** — bloc secondaire `surface.raised`, discret, sous la ligne de flottaison.
5. Nom du produit, marchand, compte à rebours, nombre de participants — métadonnées, `label`/`caption`,
   `text.muted`.
6. Le reste (description produit, image, ma commande) descend sous le scroll. Rien de tout cela ne
   doit concurrencer le prix ou la barre au premier écran.

Règle des 10 secondes : sans scroll, un visiteur lit combien on est, combien ça coûte, combien il
manque. Tout élément qui n'aide pas à répondre à ces trois questions est supprimé de la zone visible
initiale.

Couleur : jaune = la barre de progression et le bouton d'action, uniquement. Vert = réservé à
l'instant du déblocage de palier et au bloc d'économie une fois qu'il y en a une. Rouge = uniquement
si `seconds_remaining` < 6h. Bleu marine = jamais sur cet écran (réservé au dashboard pro).

---

## Wireframe ASCII — état nominal (groupe OPEN, en cours)

```
┌─────────────────────────────────────────────┐
│ ←                                        ⇪   │  header : retour · partager (icônes seules,
│                                               │  44px de cible tactile)
│  Engrais NPK 15-15-15 · sac de 50 kg         │  label, text.muted
│  Agro-Intrants Zio                           │  caption, text.muted
│                                               │
│           19 000 F                           │  ← display 44/48, Archivo 700, tabular-nums
│           le sac                             │  ← caption, text.muted, juste sous le prix
│                                               │
│  ████████████████████░░░░░░░░  146 / 200     │  ← ProgressBar jaune→lime, radius pill
│                                               │     chiffres à droite, tabular-nums, label
│  38 participants · 146 sacs                  │  ← caption, text.muted (D1 : les deux affichés,
│                                               │     seule la quantité pilote la barre)
│                                               │
│  Il manque 54 sacs                           │  ← heading 20/26, brand.ink
│  pour débloquer le prochain prix             │  ← body, text.muted
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Prochain palier                          │ │  ← bloc surface.raised, radius 12
│  │ 17 500 F le sac à partir de 200 sacs     │ │
│  │ Économie potentielle : 1 500 F/sac       │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Se termine dans 1 j 14 h                    │  ← label, text.muted (ou alert.red si < 6h,
│                                               │     cf. règle couleur)
│                                               │
│  [ image / illustration produit ]            │  ← sous la ligne de flottaison
│  Description courte du produit…              │
│                                               │
│  ─────────────────────────────────────────   │  ← filet 1px, line
│  Ma participation                            │  ← si my_membership.joined = true
│  4 sacs commandés · 76 000 F                 │
│                                               │
├───────────────────────────────────────────────┤
│  [        Rejoindre le groupe        ]       │  ← barre d'action fixe, SEULE ombre autorisée
└─────────────────────────────────────────────┘  ← bouton primary jaune, texte brand.ink, radius pill
```

Si `my_membership.joined = true`, le bouton de la barre fixe devient secondaire et son libellé
change : **« Inviter des proches »** (action de croissance prioritaire une fois qu'on a rejoint,
cf. IA-2). Un lien texte discret « Voir ma commande » reste accessible au-dessus du bouton.

---

## Libellés exacts (français)

| Élément | Libellé |
|---|---|
| Titre unité prix | « le sac » *(généralisé : `product.unit_label` interpolé, ex. « le kit », « le sachet »)* |
| Compteur participants | « {participants_count} participants · {current_quantity} {unit_label_pluriel} » |
| Message de manque | « Il manque {quantity_to_next_tier} {unit_label_pluriel} » |
| Sous-titre du manque | « pour débloquer le prochain prix » |
| Bloc palier suivant — titre | « Prochain palier » |
| Bloc palier suivant — corps | « {next_tier.unit_price} F le {unit_label} à partir de {next_tier.min_quantity} {unit_label_pluriel} » |
| Économie potentielle | « Économie potentielle : {potential_unit_saving} F/{unit_label} » |
| Compte à rebours | « Se termine dans {j} j {h} h » *(sous 1h : « Se termine dans {m} min », en `alert.red`)* |
| Bloc ma participation | « Ma participation » |
| Détail participation | « {my_membership.quantity} {unit_label_pluriel} commandés · {my_membership.total_amount} F » |
| CTA non rejoint | « Rejoindre le groupe » |
| CTA déjà rejoint | « Inviter des proches » |
| Lien secondaire (rejoint) | « Voir ma commande » |
| Dernier palier atteint | Le bloc « Prochain palier » disparaît, remplacé par « Dernier prix atteint · palier maximal débloqué » |

Aucun libellé technique (« quantité restante avant palier N+1 », « seuil », « tier ») n'apparaît côté
utilisateur. Ces termes restent dans le code et l'API uniquement.

---

## États

### Chargement (premier accès à l'écran, avant la première réponse de `GET /groups/{id}`)
- Squelette gris clair (`surface.raised`) à la place du prix, de la barre et du bloc palier suivant,
  mêmes dimensions que l'état final pour éviter tout saut de layout au premier rendu réel.
- Pas de spinner plein écran : le header et le nom du produit (si déjà connus, ex. venant de la fiche
  produit) restent affichés immédiatement.
- Aucun texte de chargement écrit ("Chargement…") — le squelette suffit.

### Erreur (échec réseau, groupe introuvable)
- Le prix, la barre et le bloc palier disparaissent, remplacés par un bloc centré :
  icône neutre + « Groupe introuvable » ou « Connexion impossible » selon le cas
  (404 vs erreur réseau — le front distingue les deux, cf. réponses d'erreur uniformes du backend).
- Un bouton secondaire « Réessayer » relance l'appel. Pas de couleur alerte ici : une erreur réseau
  n'est pas une urgence temporelle, `alert.red` reste réservé au compte à rebours.
- La barre d'action fixe disparaît : aucune action n'est possible sur un groupe qu'on ne peut pas lire.

### Action en cours — rejoindre
- Dès l'appui sur « Rejoindre le groupe », un sheet modal (feuille « Rejoindre », spécifiée séparément)
  s'ouvre pour saisir la quantité. Ce n'est qu'après confirmation dans ce sheet que l'écran groupe
  lui-même passe en état d'action : le bouton de la barre fixe affiche un indicateur de chargement
  inline (le texte est remplacé par un indicateur, la largeur du bouton ne change pas) et se désactive.
- Timeout perçu : si la réponse dépasse ~3s, aucun changement de libellé — on ne fait pas mentir le
  bouton sur un réseau lent, on attend simplement le retour de l'API.

### Palier débloqué (transition déclenchée par un changement de `current_tier` entre deux polls)
- Séquence unique de 900ms spécifiée dans `motion.md` : ancien prix barré qui glisse vers le nouveau
  prix en `unlock.green`, compteur qui s'incrémente jusqu'à `current_quantity`, barre qui atteint le
  seuil. Un bref bandeau `unlock.green.soft` peut apparaître sous le prix pendant quelques secondes :
  « Palier débloqué · nouveau prix pour tout le groupe » puis disparaît sans action utilisateur.
- C'est la SEULE animation non déclenchée par l'utilisateur de toute l'application (cf. `<moment_unique>`).

### Groupe verrouillé / terminé (`status = LOCKED` ou `COMPLETED`)
- La barre d'action fixe disparaît (plus rien à rejoindre). Un bandeau `surface.raised` en haut du
  prix indique : « Groupe complet » (COMPLETED) ou « Groupe verrouillé » (LOCKED).
- Le prix, la barre et les métadonnées restent visibles en lecture seule : c'est un état de fierté
  ("regardez ce qu'on a obtenu"), pas un état d'excuse.

### Groupe annulé (`status = CANCELLED`)
- Remplace le bloc prix/barre par un message neutre : « Ce groupe n'a pas atteint son objectif minimum
  avant la date limite. » suivi de « Commande annulée, aucun débit effectué. » si `my_membership.joined`.
- Aucune barre d'action. Un seul bouton secondaire : « Voir des groupes similaires » (renvoie à la
  fiche produit).

### Visiteur non connecté (accès via lien partagé, route web `/g/{share_code}`)
- Écran identique à l'état nominal, mêmes libellés, même hiérarchie. Seule différence : le CTA de la
  barre fixe est toujours « Rejoindre le groupe » (jamais « Inviter », un visiteur n'a rien à inviter),
  et l'appui ouvre l'inscription au lieu du sheet de quantité, puis ramène sur ce même écran groupe
  une fois l'inscription terminée.
- Cet écran spécifique (bandeau d'accroche éventuel pour un non-connecté) est traité en détail dans
  la fiche « Groupe en vue publique », à spécifier après validation de ce document.

---

## Accessibilité

- Contraste AA vérifié : `brand.ink` sur `brand.yellow` (texte sur bouton), `text.muted` sur
  `surface.white` et sur `surface.raised`.
- Toutes les cibles tactiles (retour, partager, CTA, lien « Voir ma commande ») ≥ 44px.
- Le bouton de la barre d'action fixe a un focus visible (contour 2px `brand.ink`) pour la cible web —
  utile pour le jury qui naviguera peut-être au clavier sur `/g/{share_code}`.
- Les chiffres tabulaires (`tabularNums` de `typography.ts`) s'appliquent au prix, à la barre et au
  compte à rebours : aucun saut latéral pendant le polling ou l'animation de déblocage.

---

*Statut : en attente de validation humaine. Ne pas commencer les composants primitifs
(`Button`, `ProgressBar`, `PriceDisplay`, `CounterDisplay`, etc.) ni les écrans suivants avant le
gel de ce document et de `shared/theme/tokens.ts`.*
