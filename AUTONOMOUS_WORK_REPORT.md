# Autonomous Work Report

## Session

**Date** : 5 septembre 2026, session autonome d'environ 2 h
**Branche** : `front/phase-2` (publiée sur `origin/front/phase-2`)
**Commits ajoutés** : 2 — `03423ce`, `a215521`
**Rôle** : Senior Android / UI-UX Engineer + Tech Lead, exécution autonome

Point de départ : `fe2dac0`. Le backend, le dashboard et le câblage complet de
l'application acheteur étaient déjà livrés et vérifiés lors des sessions
précédentes. Cette session portait sur l'UI/UX, la structure de navigation, la
robustesse sur appareil et la préparation du build.

---

## ⚠️ Décision NON prise — arbitrage requis

**Conflit de charte : quelle couleur porte l'action primaire ?**

| Source | Règle |
|---|---|
| `YAS_..._Master_Prompt.md` §1 | **Vert = primaire** (CTA, navigation active, badges). *« Le jaune ne doit pas dominer toute l'interface. »* |
| `docs/PROMPT-CONCEPTION.xml` `<regle_couleur>` | **Jaune = action.** *« Le jaune signifie "tu peux agir ici". Le vert signifie "quelque chose a été gagné". »* |

Les deux documents sont exactement opposés sur ce point.

**Je ne l'ai pas tranché**, pour trois raisons :

1. `CLAUDE.md` interdit d'arbitrer seul une contradiction touchant
   `<design_tokens>` — ce bloc a déjà été dégelé une fois par décision humaine
   explicite, et sa règle actuelle est argumentée, pas subie.
2. Le fichier de directives demande lui-même *« l'interprétation la plus
   conservatrice »* et *« ne pas casser l'existant »*.
3. Inverser les couleurs d'action sur l'ensemble de l'application est une
   modification massive et très visible. La faire sans supervision, à la veille
   d'une démonstration, serait un pari.

**Ce que j'ai fait à la place** : la palette n'a pas bougé d'un hexadécimal, et
aucune couleur nouvelle n'a été introduite. Les deux documents s'accordent sur ce
point, et sur le fait que le jaune ne doit pas envahir l'écran — ce que la règle
actuelle impose déjà.

**Décision attendue** : un mot suffit. L'inversion représente environ 30 minutes
(Button primaire, ProgressBar, points d'onboarding, onglet actif) et je la ferai
d'un bloc, tokens inchangés.

---

## Completed

### Safe areas — le défaut le plus grave pour un APK
Aucun écran n'utilisait les encarts système. Sur un appareil réel, le titre passe
sous la barre de statut et les boutons du bas sous la barre de geste Android.
**Invisible au navigateur, criant sur téléphone.**
- `AppBar` porte l'encart haut.
- Nouveau primitif `ActionBar`, qui porte l'encart bas et remplace les cinq
  barres d'action recopiées d'écran en écran.
- L'accueil, qui n'a pas d'AppBar, porte son propre encart haut.

### Navigation par onglets
L'application n'avait qu'une pile. « Mes groupes » et « Mes commandes » ne
s'atteignaient qu'en passant par le profil, lui-même caché derrière une icône :
**deux des quatre destinations utiles étaient à trois touchers**, et rien
n'indiquait à l'utilisateur où il se trouvait.
- Les quatre écrans racines passent dans un groupe `(tabs)`.
- **Les chemins d'URL sont inchangés** : aucun lien existant n'est cassé.
- Le profil perd les deux liens devenus redondants.

### Onboarding
Trois écrans, une seule fois, contenu strictement dérivé du produit (achat
groupé, prix rétroactif, partage). Aucune promesse inventée, aucun chiffre
étranger au jeu de démonstration. Le splash reste affiché jusqu'à la décision de
redirection, sinon l'accueil clignote avant de céder la place.

### Splash et identité Android
- `splash` configuré, fond `brand.ink`, plugin `expo-splash-screen` aligné —
  sans quoi Android affiche un blanc bref avant le splash.
- Icône adaptative : le fond était `#E6F4FE`, **un bleu clair générique hors
  charte**. Remplacé par `brand.yellow`.
- Identifiant de paquet fixé : `tg.kashflow.app`.

### Affichage du mot de passe
Tout champ `secureTextEntry` reçoit d'office l'œil d'affichage. Saisir un mot de
passe sans pouvoir le relire, sur un clavier Android, est la première cause
d'échec de connexion.

### États et accessibilité
- « Mes groupes » n'avait aucun état d'erreur : une API injoignable y affichait
  *« vous ne participez à aucun groupe »* — faux et décourageant.
- Un `Pressable` de la fiche produit n'était ni annoté ni nommé pour les lecteurs
  d'écran.

---

## Partially Completed

- **`colorPrimary` natif Android** reste `#023c69`, un bleu par défaut du gabarit
  Expo. Le corriger demande `expo-build-properties` ou un plugin de config, non
  installable (registre npm injoignable pendant la session). Impact limité : cette
  couleur ne touche que quelques widgets natifs rarement visibles.
- **Dashboard** non revérifié : il n'existe pas sur `front/phase-2`, issue de
  `UI`. Il est intact et vérifié sur `dash/phase-2`, et AGENT_DASH l'a fait
  évoluer depuis sur `dash/unified`.

---

## Files Created

- `app/app/(tabs)/_layout.tsx` — barre d'onglets
- `app/app/onboarding.tsx` — introduction en trois écrans
- `app/lib/onboarding.ts` — état « vu », observable et persisté
- `app/components/ui/ActionBar.tsx` — barre d'actions avec encart bas
- `AUTONOMOUS_WORK_REPORT.md`

## Files Modified

- `app/app.json` — splash, icône adaptative, package, retrait de `userInterfaceStyle`
- `app/package.json` — scripts de build explicites
- `app/app/_layout.tsx` — redirection onboarding, splash tenu
- `app/app/(tabs)/{index,mes-groupes,mes-commandes,profil}.tsx` — déplacés, encarts, états
- `app/app/{confirmation,creer-groupe,partager,produit}/…` — `ActionBar`, accessibilité
- `app/features/groupe/GroupScreen.tsx` — `ActionBar`
- `app/components/ui/{AppBar,Field,index}.tsx` — encart haut, œil de mot de passe

---

## Tests

| Suite | Résultat |
|---|---|
| Backend `pytest` | **164 passés**, 50 s |
| Typecheck app (`tsc --noEmit`) | **0 erreur** |
| Navigation + responsive (Chromium) | **11 / 11** |
| Parcours acheteur complet (Chromium) | **16 / 16** |
| Livrables P0 (Chromium) | **13 / 13** |
| Erreurs console | **aucune** |

Responsive vérifié à **320, 390 et 480 px** : aucun débordement horizontal.

Tous les tests navigateur tournent **contre le backend réel**, pas des fixtures.
La base de démonstration est réinitialisée après chaque passage et se trouve dans
son état de pitch : **146/200 sacs @ 19 000 F**.

---

## Build

| Cible | Commande | Résultat |
|---|---|---|
| Web | `expo export --platform web` | **Réussi** — bundle 2,2 Mo |
| Projet natif Android | `expo prebuild --platform android` | **Réussi**, sans avertissement |
| **APK** | `expo run:android --variant release` | **Non réalisable** — voir ci-dessous |

**L'APK n'a pas pu être compilé, et ce n'est pas un problème de code.** La
machine n'a ni SDK Android, ni `gradle`, ni `sdkmanager`, ni `eas-cli`, et
`ANDROID_HOME` n'est pas défini. Le registre npm est resté injoignable pendant la
session (`ETIMEDOUT`), ce qui a aussi empêché l'installation d'`expo-system-ui`.

Ce qui est vérifié : la configuration native est correcte et le projet Android se
génère proprement. Il ne manque que la chaîne de compilation.

---

## Bugs Fixed

1. **Boucle d'onboarding** — l'état « vu » était lu au montage et jamais
   rafraîchi. Après « Commencer », le layout racine voyait toujours « non vu » et
   redirigeait aussitôt : **l'utilisateur restait enfermé**. Trouvé au test, pas à
   la relecture.
2. **Libellés d'onglets tronqués** — hauteur de barre calée sur la cible tactile
   minimale au lieu de icône + libellé.
3. **Écrans sous la barre de statut** — voir safe areas.
4. **Icône Android hors charte** — `#E6F4FE`.
5. **Absence d'état d'erreur sur « Mes groupes »**.
6. **Scripts npm cassés par `prebuild`** — il les avait basculés vers `expo
   run:android` alors qu'`android/` n'est pas versionné : un coéquipier lançant
   `npm run android` sans prebuild aurait eu un échec incompréhensible.

---

## Remaining Issues

- **Conflit de charte non tranché** (voir plus haut) — bloquant pour la finition.
- **APK** : nécessite EAS Build (compte Expo) ou l'installation du SDK Android.
- **`colorPrimary` natif** cosmétique, non corrigé faute de réseau.
- **`EXPO_PUBLIC_API_BASE_URL`** devra pointer sur une IP joignable ou l'API
  déployée avant tout build d'APK. `localhost` désigne le téléphone lui-même.
- **Intégration** : `front/phase-2` et `dash/unified` restent à fusionner sur
  `main` — décision de l'intégrateur.

---

## Decisions Made Autonomously

1. **Ne pas inverser la palette** — motivé plus haut. La décision la plus
   conservatrice, et la seule compatible avec `CLAUDE.md`.
2. **Ne pas créer « Mot de passe oublié »** (PROMPT 05). Aucun endpoint de
   récupération n'existe et la fonctionnalité est hors `<perimetre>`. Un écran
   qui prétend envoyer un code sans rien envoyer serait un mensonge à l'écran.
   Le fichier de directives dit lui-même *« selon le cahier des charges »*.
3. **Ne pas créer « Paramètres »** (PROMPT 16) — rien à y régler : aucune
   préférence, pas d'i18n (exclue), pas de notifications push (exclues).
4. **Ne pas créer « Filtres / Tri »** (PROMPT 10) — trois produits au catalogue.
   Un filtre sur trois éléments est du bruit ; la recherche existe déjà.
5. **Pas de permissions Android** (PROMPT 21) — l'application n'accède ni à la
   caméra, ni au stockage, ni à la position. En demander serait injustifiable.
6. **Retirer `userInterfaceStyle`** plutôt que d'attendre un réseau défaillant.
7. **Groupe `(tabs)` plutôt qu'une barre maison** — chemins d'URL préservés,
   aucun lien cassé, comportement natif (retour Android, état par onglet).

---

## P0 Status — complet

| Livrable | État |
|---|---|
| Auth (inscription / connexion / me) | ✅ |
| Catalogue + fiche produit | ✅ |
| Groupe : création, consultation, rejoindre, quitter | ✅ |
| Moteur de paliers, prix serveur exclusivement | ✅ |
| Commande créée au join, prix rétroactif | ✅ |
| Paiement mocké (PENDING → SUCCESS) | ✅ |
| Partage : lien + WhatsApp pré-rempli | ✅ |
| Espace commerçant (produits + paliers + groupes) | ✅ (dans `/dashboard`) |
| Dashboard KPI | ✅ |
| IA-1 assistant de paliers | ✅ |
| IA-2 messages de partage | ✅ |

## P1 Status
Sans objet : le contrat ne définit pas de P1. Le périmètre est P0 + IA-3 en P2.

## P2 Status
**IA-3 — Smart Group Discovery : livrée et branchée.** Elle intercepte la
création d'un groupe quand un équivalent existe, avec la justification du modèle
et un « Créer quand même ». Autorisée explicitement par l'orchestrateur.

---

## Recommended Next Steps

1. **Trancher le conflit de charte** (5 secondes de décision, ~30 min de travail).
2. **Choisir la voie de l'APK** : EAS Build (compte Expo, aucun SDK local,
   ~15 min) ou installation du SDK Android sur cette machine.
3. **Déployer le backend** — prévu heure 40 au contrat. C'est lui qui fixera
   `EXPO_PUBLIC_API_BASE_URL` dans l'APK.
4. **Fusionner** `front/phase-2` puis `dash/unified` sur `main`.
5. **Répéter la démonstration** de bout en bout sur un vrai téléphone, sur le
   Wi-Fi du lieu — c'est là que les surprises restantes apparaîtront.
