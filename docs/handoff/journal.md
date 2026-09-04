# Journal de synchronisation entre agents

Seul canal de synchronisation asynchrone entre les sessions Claude Code. Une ligne par
livrable terminé et par blocage. Les échanges humains vont sur le canal de l'équipe,
pas ici.

Format : `[HH:MM] AGENT_X — fait / bloqué par / attend`

---

[10:45] AGENT_BACK — démarré, contrat lu en entier, branche `back/phase-1a`
[11:02] AGENT_BACK — fait : `pricing.py`, module pur. Vérifié à la main sur 8 quantités, 146→19 000 et 200→17 500 conformes au contrat
[11:07] AGENT_BACK — bloqué par : rôle et base PostgreSQL absents, création impossible sans sudo. Demande transmise à l'orchestrateur
[11:20] AGENT_BACK — débloqué, base créée. Fait : modèles SQLModel, `seed.py --reset`. Seed conforme : 38 participants, 146 sacs, 19 000 F, il manque 54 sacs
[11:26] AGENT_BACK — fait : `GET /groups/{id}` et `GET /groups/code/{share_code}`. Payload GroupDetail 20/20 champs, mêmes noms et même ordre que le contrat. Zéro divergence
[11:26] AGENT_BACK — fait : `openapi.json` publié dans `/backend`, exploitable par AGENT_FRONT pour générer ses types sans lancer le serveur
[11:36] AGENT_BACK — fait : bascule Anthropic → Groq sur décision de l'orchestrateur. Voir `contract-changes.md`
[11:44] AGENT_BACK — fait : modèle arrêté à `qwen/qwen3.8-27b`, IA-2 réduite au français. Correction d'une erreur d'analyse consignée dans `contract-changes.md`
[11:47] AGENT_BACK — fait : contradiction du journal arbitrée par l'orchestrateur, `CLAUDE.md` et `.env.example` mis à jour
[11:47] AGENT_BACK — attend : gate humain de fin de Phase 1A et gel du contrat avant de passer à l'étape 3 (auth JWT) puis 5 (join/leave transactionnel)
[11:52] AGENT_BACK — fait : reset de base rejoué deux fois, sortie identique au sac près. La démo est rejouable autant que nécessaire
[11:54] AGENT_BACK — fait : Phase 1A fusionnée sur `main` et poussée. Les autres sessions doivent **repartir de `main`** : `CLAUDE.md` a changé et `backend/openapi.json` est disponible pour générer les types sans lancer le serveur
[11:56] AGENT_BACK — fait : README complété (étape de seed manquante, création de la base, comptes de démo). Un clone qui suivait le README démarrait sur une base vide
[11:56] AGENT_BACK — attend : `tokens.ts` + spec écran groupe (AGENT_UI), types TS + fixtures + squelette de routes (AGENT_FRONT). Backend en pause volontaire, aucun code de Phase 2 écrit
[12:05] AGENT_UI — fait : `shared/theme/tokens.ts` et `typography.ts` (palette, espacement, rayons, durées d'animation, échelle typo). Aucune valeur hexadécimale ailleurs dans le projet
[12:05] AGENT_UI — fait : `docs/design/screens.md`, spec complète de l'écran groupe (wireframe, hiérarchie, libellés exacts, états chargement/erreur/annulé/verrouillé/vue publique) et `docs/design/motion.md` (séquence de déblocage de palier, 900 ms)
[12:10] AGENT_UI — fait : composants primitifs `app/components/ui/**` — Text, Button, Card, Divider, Badge, ProgressBar, PriceDisplay, CounterDisplay, Field, Sheet, EmptyState
[12:10] AGENT_UI — bug trouvé par capture d'écran réelle, invisible au typecheck : `expo-google-fonts` charge chaque poids sous un nom distinct (`Archivo_700Bold`), pas `Archivo` + fontWeight. Le texte retombait silencieusement sur une police serif système. Corrigé dans `app/components/ui/nativeFont.ts`. `typography.ts` reste générique (family + weight), correct pour /dashboard qui chargera ces polices en CSS standard
[12:10] AGENT_BACK — reprise sur instruction de l'orchestrateur : les coéquipiers travaillent en local, le backend doit être prêt à accueillir leurs parties. Fin de la pause
[12:15] AGENT_FRONT — fait : `shared/api/types.ts`, un type par entité et par payload du contrat, GroupDetail au champ près. À recouper avec `backend/openapi.json` livré par AGENT_BACK
[12:15] AGENT_FRONT — fait : squelette expo-router complet (accueil, fiche produit, écran groupe via `/groupe/{id}` ET `/g/{share_code}`, rejoindre, confirmation, partager, mes groupes, mes commandes, profil, connexion, inscription)
[12:15] AGENT_FRONT — fait : couche API typée avec injection JWT, fixtures GroupDetail/ProductDetail/ImpactStats derrière `USE_MOCKS`, hook `useGroupPolling` (2000 ms, pause hors focus, détection de franchissement de palier), partage WhatsApp à trois niveaux de repli
[12:15] AGENT_FRONT — décision technique : `/app/(routes)/**` du prompt utilise l'option `root` d'expo-router, explicitement déconseillée par Expo SDK 57. Remplacée par la racine par défaut : les routes vivent dans `app/app/**`. Aucun import relatif n'a changé
[12:15] AGENT_FRONT — décision technique : depuis SDK 56, `expo-router` n'est plus compatible avec `@react-navigation/native` (Metro bloque le build). `useIsFocused` importé depuis `expo-router/react-navigation`
[12:20] AGENT_FRONT — vérifié de bout en bout au navigateur : parcours inscription → rejoindre → confirmation → écran groupe avec « Ma participation ». Zéro erreur console. Auth et join mockés pour que tout le parcours tourne sans backend
[12:40] AGENT_BACK — fait : étape 3, auth JWT complète (`/auth/register`, `/auth/login`, `/auth/me`) + dépendances `current_user`, `require_merchant`, `require_group_creator`
[12:40] AGENT_BACK — fait : étape 5, `join` et `leave` transactionnels avec `SELECT … FOR UPDATE` sur la ligne groupe et propagation rétroactive du prix à toutes les commandes actives
[12:40] AGENT_BACK — fait : étape 6, catalogue (`/products`), commandes, paiement mocké, `/merchant/dashboard`, `/stats/impact`
[12:40] AGENT_BACK — fait : `POST /demo/simulate-joins` protégé par `X-Demo-Token`. Livrable de Phase 1 qui avait été oublié, désormais en place
[12:40] AGENT_BACK — validé : 20 joins simultanés, compteur exact (186 sacs), un seul prix en base, zéro doublon de téléphone. Le verrou de ligne tient
[12:40] AGENT_BACK — validé : franchissement de palier à 201 sacs, les 56 commandes basculent de 19 000 à 17 500 en base, y compris les 38 seedées
[12:40] AGENT_BACK — reste à faire : étape 7 (endpoints IA avec fallback déterministe), clôture de groupe à échéance (D8), `POST /merchant/products` + paliers
[12:40] AGENT_BACK — pour AGENT_FRONT et AGENT_DASH : 17 chemins publiés, `backend/openapi.json` à jour. Rien ne vous bloque côté API
[12:50] AGENT_UI — fait : `@expo/vector-icons` installé, absent alors que `connexion.tsx` l'importait — l'écran de connexion plantait au chargement
[12:50] AGENT_UI — attend : décision sur la nouvelle maquette HTML de l'orchestrateur (v2, tous écrans + espace pro). L'interface sera reprise dessus
[13:20] AGENT_UI — fait : écran groupe aligné sur la maquette v2 (en-tête groupe + code + compte à rebours, prix dominant avec « au lieu de », grille de paliers, économie du groupe, point de retrait, barre Inviter + Rejoindre). Nouveaux primitifs : AppBar, Avatar, TierRow, pastille Badge « urgent », helper alpha() dans tokens.ts. Vérifié au navigateur, zéro erreur console
[13:20] AGENT_UI — fait : `shared/**` publié sur `main` (tokens, typography, types) — AGENT_DASH en avait besoin et ne suivait pas la branche UI
[13:20] AGENT_UI — vérifié : `GroupDetail` de `shared/api/types.ts` recoupé champ par champ avec `backend/openapi.json`, 20/20, zéro divergence
[13:20] AGENT_UI — demande à AGENT_BACK, trois manques de données pour rendre l'écran groupe complet de la maquette :
        1. `GroupDetail.tiers[]` — la maquette affiche les 4 paliers, le payload ne porte que current_tier et next_tier. Un second appel violerait « payload auto-suffisant » (D6). Seuls 2 paliers sont affichés en attendant
        2. Aperçu des participants (initiales ou prénoms des N derniers) — la maquette montre des avatars, le payload n'a que participants_count. Pas d'avatars affichés, plutôt que d'inventer des initiales
        3. Localisation du commerçant dans `product` — la maquette écrit « Agro-Intrants Zio, Tsévié », le payload n'a que merchant_name
[13:20] AGENT_UI — attend : arbitrage sur la direction visuelle. Des écrans (accueil, produit, connexion, inscription) sont réécrits en parallèle dans un style qui s'écarte de la maquette et des tokens (emoji, fontSize/fontWeight en dur, hex en dur, KPI « 125 000 000 FCFA » absent du jeu de démo). Je n'y touche pas pour ne pas produire deux versions concurrentes
[14:10] AGENT_UI — fait : docs/PROMPT-CONCEPTION.xml, section <design_tokens>, mise à jour (sur demande explicite humaine — ce bloc reste gelé par défaut). Ajout d'un bloc <etat_implementation> qui documente sans rien changer aux valeurs gelées : le helper alpha() de tokens.ts, les composants ajoutés depuis la liste de départ (Avatar en réserve, TierRow, AppBar, ProductCard, nativeFont.ts), et la décision arbitrée de refuser un reskin « Premium & Energetic » (ombres, rayons 24+, couleurs adoucies, ExtraBold, fond gris) qui contredisait directement le contrat — consignée pour que la décision ne soit pas rouverte sans dégel explicite.
[14:55] AGENT_BACK — fait : étape 7. `POST /ai/suggest-tiers` et `POST /ai/share-message`, timeout 4 s, limitation à 12 requêtes par minute, repli déterministe intégral sans clé API
[14:55] AGENT_BACK — fait : reliquat étape 6. `POST /merchant/products` et `POST /merchant/products/{id}/tiers`. Un produit sans grille valide reste en brouillon et n'apparaît pas au catalogue
[14:55] AGENT_BACK — fait : clôture D8 à l'échéance, en évaluation paresseuse à la lecture. Pas d'ordonnanceur, le contrat exclut cette complexité
[14:55] AGENT_BACK — validé : minimum atteint → groupe LOCKED, 38 commandes CONFIRMED. Minimum non atteint → groupe CANCELLED, commande CANCELLED/REFUNDED, paiement REFUNDED, notification émise
[14:55] AGENT_BACK — validé : les trois grilles interdites par le cahier des charges sont rejetées (prix croissant, chevauchement, dernier palier fermé)
[14:55] AGENT_BACK — validé : IA-1 renvoie le palier 1 au prix de détail 3 fois sur 3. Sans ce correctif, les deux modèles le bradaient systématiquement — `validate_tiers` ne rattrape pas cet invariant, qui n'est pas au contrat
[14:55] AGENT_BACK — non-régression : 146 → 200 sacs, 19 000 → 17 500, économie communautaire 900 000 FCFA, un seul prix en base. Chiffre identique à celui du contrat
[14:55] AGENT_BACK — l'API couvre désormais les 18 endpoints du contrat, plus `/demo/simulate-joins` et `/orders/{id}`. Étapes 1 à 7 terminées
[14:55] AGENT_BACK — attend : la fusion de `back/phase-2` sur `main` par l'intégrateur. `UI` et `dash/phase-1a` sont toujours au commit zéro
[15:00] AGENT_UI — fait : contrat de design dégelé sur décision humaine explicite (« Premium & Energetic »). shared/theme/tokens.ts v2 — vert émeraude #0EA968, jaune ambre #FFB020, fond d'écran surface.page #F2F4F7 (les cartes restent blanches, radius 24 via radii.card), ombre douce shadow.card, dégradés gradients.primary/success (expo-linear-gradient installé). typography.ts gagne fontWeights.numbersExtraBold, réellement chargé (Archivo_800ExtraBold dans _layout.tsx, nativeFont.ts étendu) — pas juste écrit en dur, même piège que le bug de police déjà trouvé deux fois. PROMPT-CONCEPTION.xml <design_tokens> mis à jour en conséquence (palette, rayons, profondeur, principe_directeur), l'ancienne version et le refus initial archivés dans <etat_implementation>/<decision_arbitree>.
[15:00] AGENT_UI — fait : Card (variant "elevated"), Button (dégradé primaire), ProductCard (bloc icône + avant/après réel), GroupScreen (cartes bento en relief, badge "Presque rempli !" dès 90% réel, avatars anonymes empilés selon participants_count réel), Accueil (bloc impact en dégradé alimenté par /stats/impact, pas un chiffre en dur). Aucune donnée inventée reprise de l'exemple fourni avec la demande : ProductCard.best_open_group_price reste undefined tant qu'aucun groupe réel n'existe pour le produit (2 des 3 produits du catalogue démo).
[15:00] AGENT_UI — fait : fond surface.page propagé à tous les écrans (accueil, groupe, fiche produit, profil, confirmation, connexion, inscription, stubs), cartes correspondantes passées en variant="elevated". Vérifié au navigateur sur tout le parcours, zéro erreur console.
[15:20] AGENT_UI — deux bugs réels signalés par l'humain, vérifiés et corrigés (pas supposés) :
        1. « je ne vois pas de jaune » : le dégradé fonctionnait techniquement (vérifié via getComputedStyle, linear-gradient bien présent en DOM), mais #FFB020 a une teinte ~39° — objectivement orange, pas jaune (l'orange commence vers 20-40°). Remplacé par #FFC700 (~47°, jaune doré chaud, reste net­tement jaune).
        2. « corrige l'ombrage » : les cartes utilisaient shadowColor/shadowOffset/shadowOpacity/shadowRadius, dépréciés sur react-native-web récent (avertissement console) et quasi invisibles sur le fond clair surface.page. Ajout de boxShadow (chaîne CSS) en plus, opacité et flou augmentés (0.08→0.14, 16px→20px).
[15:20] AGENT_UI — refusé : react-native-paper. Bibliothèque de composants UI tierce, explicitement interdite (<interdits transversaux>, item 1 : "Ne pas installer de bibliothèque UI tierce (NativeBase, Tamagui, gluestack)"). Contrairement au dégel de <design_tokens>, cette règle n'a pas été rouverte — apporterait son propre système de thème Material Design en conflit avec les primitifs déjà construits, pour un coût de configuration et un risque de dépendance que le hackathon n'a plus le temps d'absorber.
[15:35] AGENT_UI — fait : react-native-paper installée et intégrée sur décision humaine explicite (dégel de l'interdit « pas de bibliothèque UI tierce »). PaperProvider avec thème dérivé de shared/theme/** (app/lib/paperTheme.ts), aucune couleur Material par défaut. Button, Field, Card enveloppent maintenant les composants Paper. ProgressBar reste custom : sa durée d'animation (motion.progressBarFillMs, 400ms, documentée et vérifiée) n'est pas pilotable depuis l'extérieur du composant Paper équivalent. /dashboard ne charge pas Paper (hors périmètre AGENT_DASH). Vérifié au navigateur, zéro erreur console, typecheck propre.
[15:35] AGENT_BACK — fait : `GET /notifications` et `POST /notifications/{id}/read`. Les lignes écrites au franchissement de palier et à l'annulation étaient illisibles, le badge in-app était impossible. Changement de contrat consigné
[15:35] AGENT_BACK — arbitrage : `require_group_creator` reste en place. Je l'avais d'abord signalé comme code mort à retirer — c'était une erreur, l'étape 3 le liste nommément comme livrable. Consigné dans contract-changes.md
[15:50] AGENT_BACK — fait : PHASE 3. 60 tests, 10,8 s. `test_pricing.py` couvre le moteur pur, `test_parcours_demo.py` couvre le parcours de démonstration de bout en bout
[15:50] AGENT_BACK — les tests tournent sur SQLite isolé : la base PostgreSQL de démonstration n'est jamais touchée. Vérifié après exécution
[15:50] AGENT_BACK — limite assumée : SQLite ignore `SELECT ... FOR UPDATE`, le verrou de ligne n'est donc pas couvert par la suite. Il reste validé à la main sur PostgreSQL avec 20 joins simultanés
[15:50] AGENT_BACK — piège rencontré : la fixture hachait 38 mots de passe bcrypt par test, la suite dépassait plusieurs minutes. Une seule empreinte réutilisée ramène à 10,8 s
[15:50] AGENT_BACK — étapes 1 à 7 terminées, Phase 3 terminée. Plus rien de critique côté backend
[16:20] AGENT_BACK — fait : couverture élargie sur autorisation de l'orchestrateur. 125 tests, 27 s. Ajout de `test_api_catalogue_groupes.py`, `test_api_commercant_ia.py`, `test_securite_et_erreurs.py`
[16:20] AGENT_BACK — la couverture élargie a trouvé 2 vrais défauts, corrigés :
[16:20] AGENT_BACK —   (1) un groupe expiré restait annoncé OPEN dans `GET /groups`, dans les groupes ouverts d'une fiche produit et dans `groups_active` de `/stats/impact`. La clôture n'était branchée que sur les lectures de détail. Ajout de `settle_expired_groups()` sur les trois chemins de liste
[16:20] AGENT_BACK —   (2) le limiteur de débit IA fuyait entre tests : état de module jamais purgé. Comportement correct en production, isolé désormais par une fixture
[16:20] AGENT_BACK — hors périmètre et non testés, car non implémentés : CRUD admin, litiges, groupes permanents. Ils sont dans `<exclus interdiction="stricte">` — je ne les ai pas construits pour pouvoir les tester
[16:20] AGENT_BACK — base de démonstration vérifiée intacte après la suite : OPEN · 146/200 sacs · 19 000 F
[16:35] AGENT_BACK — pour AGENT_DASH : les 6 endpoints demandés sont livrés, testés et poussés depuis un moment. Ils sont sur `back/phase-2`, pas sur `main` — d'où l'impression qu'ils manquent. Rien à implémenter, il faut fusionner
[16:35] AGENT_BACK — décision tranchée : les identifiants d'API sont des entiers. `/shared/api/types.ts` doit s'aligner sur l'OpenAPI publié, pas l'inverse. Consigné dans contract-changes.md
[16:35] AGENT_BACK — décision tranchée : `GET /stats/impact` reste public. C'est la page du jury, elle ne peut pas dépendre d'une session. Consigné dans contract-changes.md
[16:35] AGENT_BACK — le feu vert de Phase 2 et les specs UI des écrans professionnels ne sont pas de mon ressort : orchestrateur pour le premier, AGENT_UI pour les seconds
[17:05] AGENT_BACK — fait : IA-3 activée sur feu vert de l'orchestrateur. `POST /ai/discover-groups`. Présélection SQL, un appel modèle, seuil 0,6, 3 résultats max, repli SQL silencieux
[17:05] AGENT_BACK — défaut trouvé en conditions réelles et corrigé : la présélection cherchait la requête entière comme une seule sous-chaîne. « engrais pour mon maïs » ne remontait rien alors que le groupe existait. Recherche mot à mot désormais, test ajouté
[17:05] AGENT_BACK — garde-fous ajoutés : un identifiant inventé par le modèle est écarté, un groupe expiré n'est jamais proposé
[17:05] AGENT_BACK — fait : `groups_successful` compte LOCKED ou COMPLETED. Le KPI du jury affichait « 0 % de réussite » en permanence
[17:05] AGENT_BACK — 144 tests verts. Backend terminé : étapes 1 à 7, Phase 3, IA-1, IA-2, IA-3
[17:40] AGENT_BACK — fait : `GET /merchant/products`, le seul endpoint qui manquait vraiment. Sans lui « Mes offres » ne pouvait afficher que des groupes, et un brouillon devenait invisible à son auteur. 9 tests, changement de contrat consigné
[17:40] AGENT_BACK — 153 tests verts. 24 chemins, 46 schémas publiés dans `openapi.json`, désormais indenté pour être lisible en diff
[17:40] AGENT_BACK — pour AGENT_FRONT : `/shared/api/types.ts` diverge de l'OpenAPI sur 7 points (identifiants string, ImpactStats, SuggestTiers, ShareMessage, MerchantDashboard, deadline, GroupCard). Détail dans contract-changes.md
[18:40] AGENT_BACK — reprise de l'application acheteur sur instruction de l'orchestrateur. Branche `front/phase-2` créée depuis `UI`, `main` fusionné dedans : `UI` n'avait jamais reçu le backend, d'où son maintien sur les fixtures
[18:40] AGENT_BACK — fait : réponses aux trois demandes d'AGENT_UI du [13:20]. `best_open_group_price` et `max_quantity` livrés ; `GroupDetail.tiers[]` **non tranché** — c'est le payload gelé du contrat, l'arbitrage revient à l'humain ; aperçu des participants refusé (confidentialité). Détail dans contract-changes.md
[18:40] AGENT_BACK — fait : `shared/api/types.ts` réaligné sur l'OpenAPI. Sept divergences corrigées. Elles ne cassaient rien tant que l'app tournait sur fixtures : elles décrivaient une API que personne n'appelait
[18:40] AGENT_BACK — fait : application entièrement branchée sur l'API. `USE_MOCKS` et `lib/fixtures.ts` supprimés, pas basculés — un écran qui retombe sur des chiffres inventés afficherait 438 000 F de fiction au jury sans que personne ne le sache
[18:40] AGENT_BACK — fait : les trois derniers `ScreenStub` sont devenus des écrans réels — Partager (IA-2, P0 du périmètre), Mes commandes (`GET /orders`), Mes groupes (déduit des commandes, aucun endpoint ajouté). `ScreenStub` supprimé : plus aucun placeholder dans l'app
[18:40] AGENT_BACK — défaut trouvé en ouvrant l'écran, invisible au typecheck comme aux tests d'API : la **barre de progression n'existait pas à l'écran**. Le bloc parent aligne en `flex-start`, une vue sans largeur propre s'y effondre à zéro. C'est l'élément central du produit. Corrigé dans le primitif
[18:40] AGENT_BACK — défaut corrigé : à la déconnexion, l'invalidation du cache relançait `/auth/me` sans jeton, avec un 401 en console à chaque fois. Le cache est désormais vidé à la déconnexion, invalidé seulement à la connexion
[18:40] AGENT_BACK — vérifié dans Chromium contre le backend réel : 16 étapes du parcours acheteur, inscription → rejoindre 54 sacs → confirmation → partage → mes commandes → mes groupes → profil → déconnexion. 146 → 200 sacs, 19 000 → 17 500 F, 900 000 F. Zéro erreur console. Base réinitialisée après chaque essai
[18:40] AGENT_BACK — 162 tests backend verts
[18:40] AGENT_BACK — attend : arbitrage humain sur `GroupDetail.tiers[]`, puis la phase UI/UX. `front/phase-2` prête à être fusionnée sur `main`
[19:20] AGENT_BACK — audit de câblage : 10 endpoints sur 23 n'étaient appelés par aucun écran. Quatre correspondaient à des livrables **P0 absents de l'application**
[19:20] AGENT_BACK — fait : **création de groupe** (P0). `POST /groups` n'était appelé nulle part — on ne pouvait que rejoindre le groupe seedé. IA-3 s'insère à cet endroit et nulle part ailleurs : interception du doublon avant création, avec « Créer quand même »
[19:20] AGENT_BACK — fait : **quitter un groupe** (P0). Une commande passée était définitive côté interface. `Alert` n'existe pas sur react-native-web : sans garde-fou, le bouton n'aurait rien fait pendant une démonstration au navigateur
[19:20] AGENT_BACK — fait : **paiement mocké** (P0), PENDING → SUCCESS depuis Mes commandes
[19:20] AGENT_BACK — fait : **liste et badge de notifications**, le substitut au push explicitement accepté par le contrat. Les lignes étaient écrites en base depuis le début, rien ne les lisait
[19:20] AGENT_BACK — défaut corrigé : `<button>` imbriqué dans `<button>` sur la carte de commande — HTML invalide et cible tactile ambiguë. Deux actions explicites à la place
[19:20] AGENT_BACK — défauts corrigés : écran blanc définitif sur la fiche produit quand l'API est injoignable ; « Aucun produit trouvé » affiché sur l'accueil en cas de panne réseau ; confirmation réduite à un titre nu quand on y arrive par « Voir ma commande » ; messages d'erreur d'authentification génériques alors que l'API en renvoie de précis
[19:20] AGENT_BACK — retiré : la surface commerçant de `app/lib/api/endpoints.ts`. Elle appartient à /dashboard ; la dupliquer laissait quatre fonctions que rien n'appelait
[19:20] AGENT_BACK — vérifié dans Chromium contre le backend : 13 contrôles sur les livrables P0 + 16 sur le parcours acheteur, zéro erreur console. Base réinitialisée après chaque essai
[19:20] AGENT_BACK — reste au contrat, hors application acheteur : l'espace commerçant (IA-1, création de produit) vit dans /dashboard et y est complet
[19:20] AGENT_BACK — attend : arbitrage sur `GroupDetail.tiers[]`, puis phase UI/UX et compilation APK
[19:50] AGENT_BACK — fait : `GroupDetail.tiers[]` ajouté sur arbitrage de l'orchestrateur. L'écran groupe affiche les quatre paliers sans second appel ; `current_tier` et `next_tier` gardent leur forme gelée. 165 tests verts
[19:50] AGENT_BACK — le garde-fou de conformité du payload (20 champs) a fait échouer deux tests au moment de l'ajout, exactement comme prévu. Mis à jour à 21, pas contourné
[19:50] AGENT_BACK — fait : résolution de l'adresse de l'API pour un appareil. Sur téléphone, `localhost` désigne le téléphone : un APK compilé avec cette valeur ne joint jamais l'API et affiche « connexion impossible » partout, sans cause visible
[19:50] AGENT_BACK — l'adresse est désormais déduite de l'hôte Metro en développement natif, forcée par `EXPO_PUBLIC_API_BASE_URL` sinon — obligatoire pour un APK autonome. Le client HTTP nomme explicitement l'erreur de configuration au lieu d'une panne réseau
[19:50] AGENT_BACK — README : procédure de test sur téléphone, uvicorn sur `0.0.0.0` compris (par défaut il n'écoute que sur 127.0.0.1, injoignable depuis un appareil)
[19:50] AGENT_BACK — API vérifiée joignable depuis le réseau local sur l'IP de la machine
[19:50] AGENT_BACK — attend : phase UI/UX, puis compilation de l'APK
