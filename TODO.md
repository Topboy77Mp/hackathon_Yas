# KashFlow — Reste à faire

État au 5 septembre, avant présentation. Classé par ce qui casse la démonstration
si ce n'est pas fait.

---

## 🔴 BLOQUANT — à faire maintenant

- [ ] **Pousser les 9 commits.** `git push`
      C'est la cause de l'erreur `GO_BACK` que voit encore le coéquipier sur
      Windows : sa copie n'a jamais reçu le correctif. Rien d'autre n'explique
      qu'il la voie et pas nous.
- [ ] **Le coéquipier fait `git pull`** sur `D:\Hakkaton\hackathon_Yas`, puis
      relance Metro avec `--clear`.
- [ ] **Relancer le jeu de démonstration** sur la machine qui servira l'API :

          cd backend
          python seed.py --reset && python seed_riche.py

- [ ] **Répéter le parcours de démonstration en entier**, sur le téléphone, une
      fois. C'est la seule chose qui trouve encore des défauts à ce stade.

---

## 🟠 IMPORTANT — avant le pitch si le temps le permet

### Backend
- [ ] Déployer l'API (prévu heure 40 au contrat). Tant qu'elle tourne en local,
      la démonstration dépend du câble USB ou du Wi-Fi de la salle.
- [ ] Reporter sur `dash/*` le correctif du client HTTP qui perd le `code`
      d'erreur — le dashboard a le même défaut, il n'est pas sur cette branche.

### Front
- [ ] Vérifier le **partage WhatsApp sur l'appareil**. Jamais testé pour de vrai :
      c'est le seul chemin qu'aucun navigateur ne peut valider.
- [ ] Vérifier **« Quitter le groupe »** — la boîte de dialogue native.
- [ ] Vérifier le **retour depuis un lien de groupe** (`/g/KOVIE`), maintenant
      que `useRetour` est en place.

### Intégration
- [ ] Fusionner `front/phase-2` sur `main`.
- [ ] Fusionner `dash/unified` sur `main` (AGENT_DASH a repris le dashboard
      par-dessus mon travail, sans conflit).

---

## 🟡 DEMANDÉ, NON FAIT — et pourquoi

### Refonte visuelle « comme Yas Togo / next by Yas »
**Non faite, délibérément.** Repeindre l'application à moins d'une heure d'une
présentation est le geste qui casse une démonstration. La palette est bien
centralisée dans `shared/theme/tokens.ts`, mais la **sémantique** ne l'est pas :
le contrat pose que « le jaune signifie tu peux agir, le vert signifie quelque
chose a été gagné », et cette règle traverse tous les écrans. La changer demande
de repasser sur chaque état, pas seulement sur trois hexadécimaux.

À faire **après** le pitch, en une passe, avec du temps pour vérifier :
- [ ] Trancher : vert ou jaune en couleur d'action primaire ?
      (`YAS_..._Master_Prompt.md` dit vert ; `<regle_couleur>` du contrat dit
      jaune. Les deux documents sont opposés — voir `AUTONOMOUS_WORK_REPORT.md`.)
- [ ] Si bleu : `accent.navy` (#16357A) existe déjà dans les tokens, réservé aux
      en-têtes commerçant. L'étendre est possible sans introduire de couleur
      nouvelle.
- [ ] Reprendre `Button`, `ProgressBar`, la barre d'onglets, les puces de filtre
      et les points d'onboarding — les cinq endroits où la couleur d'action vit.

### Reproduire l'application Yas Togo
**Ne sera pas fait.** Copier l'interface d'une application existante d'un
opérateur n'est pas une décision de design, c'en est une de propriété
intellectuelle — et Yas est l'organisateur du hackathon. S'en inspirer pour le
ton et la densité, oui ; la reproduire, non.

---

## 🟢 FAIT — pour mémoire

### Backend — 191 tests verts, 28 chemins, 53 schémas
- [x] Auth JWT, inscription acheteur **et commerçant**
- [x] Mot de passe oublié (code haché, usage unique, 15 min), changement de mot
      de passe, préférences
- [x] Catalogue, recherche, tri, filtre sur groupes ouverts
- [x] Groupes : création, consultation, rejoindre, quitter, clôture à échéance
- [x] Paliers rétroactifs avec verrou de ligne (20 joins simultanés validés)
- [x] Commandes, paiement mocké, notifications
- [x] IA-1 paliers, IA-2 partage, IA-3 découverte — repli déterministe intégral
- [x] `GET /merchant/products`, `best_open_group_price`, `GroupDetail.tiers[]`
- [x] Jeu de démonstration étendu : 5 commerçants, 15 produits, 13 groupes,
      442 commandes, 2 628 800 FCFA d'économies

### Front — tous les écrans réels, plus aucun placeholder
- [x] Onboarding, splash et icônes dérivées des tokens
- [x] Navigation par onglets, safe areas haut et bas
- [x] Accueil avec recherche serveur, tri, filtre, badge de notifications
- [x] Fiche produit, création de groupe avec interception IA-3
- [x] Écran groupe : 4 paliers, scrutation 2 s, franchissement, quitter
- [x] Rejoindre, confirmation, partage IA-2, mes commandes, mes groupes
- [x] Paramètres, notifications, mot de passe oublié
- [x] États de chargement, vide, erreur et succès sur chaque écran
- [x] Clavier Android, retour arrière sans historique

### Dashboard — sur `dash/unified`
- [x] Branché sur l'API, aucune fixture
- [x] Offres, groupes, impact, simulateur de démonstration

---

## Ce qui reste hors périmètre, et le restera

Le contrat les exclut explicitement : CRUD administrateur, litiges, groupes
permanents, favoris, avis, points relais, remboursements réels, Mobile Money
réel, notifications push, i18n de l'interface, upload d'images.
