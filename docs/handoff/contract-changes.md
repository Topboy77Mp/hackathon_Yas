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

## [17:05] IA-3 activée sur feu vert de l'orchestrateur — `POST /ai/discover-groups`

Avant : IA-3 marquée `P2 — CONDITIONNELLE`, aucune table, aucune colonne, aucune
route. Le contrat interdisait de la commencer sans accord explicite.
Après : l'orchestrateur a donné le feu vert. Une route ajoutée.

    POST /ai/discover-groups   {query, product_id?}
                               → {query, suggestions[{score, reason, group}], source}

Implémentation strictement conforme à `<implementation_minimale>` : aucun
embedding, aucun pgvector, aucune base vectorielle. Présélection SQL grossière
sur les groupes ouverts, un unique appel au modèle, seuil de pertinence 0,6,
trois résultats au maximum. Repli sur les résultats SQL bruts, sans jamais
signaler l'échec.

Deux garde-fous ajoutés au-delà du contrat, parce qu'ils protègent la démo :
un identifiant de groupe inventé par le modèle est écarté (il enverrait
l'utilisateur vers un groupe inexistant), et un groupe expiré n'est jamais
proposé.

Impacte : AGENT_FRONT — interception à placer AVANT le formulaire de création
de groupe, avec deux boutons : rejoindre le groupe suggéré, ou créer quand même.
L'interception compte davantage que la finesse du rapprochement.

Notifié : non — à diffuser par l'orchestrateur.

---

## [17:05] Correction — un groupe verrouillé compte comme réussi

Avant : `groups_successful` ne comptait que les groupes `COMPLETED`.
Après : compte les groupes `LOCKED` ou `COMPLETED`.

Raison : rien ne fait franchir `LOCKED → COMPLETED` dans le périmètre du
hackathon — aucune route de livraison n'existe et le contrat n'en prévoit pas.
Le KPI affichait donc « 0 groupe réussi » et « 0 % de taux de réussite » en
permanence, y compris après qu'un groupe a atteint son objectif. Sur la page
destinée au jury, ce chiffre contredisait frontalement le récit du pitch.

Un groupe verrouillé a atteint son objectif minimum : c'est une réussite.
`CANCELLED` reste le seul échec. Aucune route ajoutée, aucun périmètre élargi.

Impacte : AGENT_DASH — `groups_successful` et `success_rate` deviennent enfin
non nuls.

Notifié : non — à diffuser par l'orchestrateur.

---

## [16:35] Décision — les identifiants d'API sont des entiers, pas des chaînes

Question posée par AGENT_DASH : le backend renvoie des `number`, `/shared/api/types.ts`
déclare des `string`.

Décision : **`number` (entier)**. Le backend est la source de vérité de l'API, et
`backend/openapi.json` publie déjà `"type": "integer"` sur `id` dans l'ensemble des
schémas — GroupDetail, ProductCard, OrderOut, NotificationOut, et tous les
`*_id`. Les clés primaires sont des entiers auto-incrémentés SQLModel.

Ce n'est donc pas un changement de contrat mais la correction d'une divergence :
c'est `/shared/api/types.ts` qui doit s'aligner sur l'OpenAPI publié, pas
l'inverse. Passer le backend en chaînes obligerait à toucher les huit modèles,
toutes les clés étrangères et le moteur de paliers, à seize heures du vendredi,
pour un gain nul.

Rappel utile : ne pas se fier au typage TypeScript pour construire les URL. Un
identifiant entier interpolé dans une chaîne fonctionne sans conversion.

Impacte : AGENT_FRONT (propriétaire de `/shared/api/types.ts`), AGENT_DASH.

Notifié : non — à diffuser par l'orchestrateur.

---

## [16:35] Décision — `GET /stats/impact` reste public

Question posée par AGENT_DASH : endpoint public, ou protégé par JWT avec rôle ADMIN ?

Décision : **public, sans authentification**. C'est l'état actuel du code.

Raisons, dans l'ordre de poids :

1. Le contrat désigne cette route comme « KPI globaux (dashboard jury) », et le
   bloc `<role id="DASH">` décrit la page Impact comme « une page unique destinée
   au jury ». Une page que le jury doit pouvoir ouvrir depuis le fond de la salle
   ne peut pas dépendre d'une session.
2. Une authentification sur le chemin de la démonstration est un risque net :
   cinq minutes de présentation, un réseau incertain, un mot de passe à saisir au
   vidéoprojecteur. Le contrat juge chaque décision à l'aune de « est-ce que ça
   rend la démo plus solide ou est-ce que ça la met en danger ».
3. La charge utile est strictement agrégée : compteurs et sommes, aucun nom,
   aucun téléphone, aucune commande individuelle.
4. Le rôle ADMIN n'a aucun parcours dans le périmètre — `<exclus>` écarte tout le
   CRUD administrateur. Créer une route protégée par ADMIN supposerait un écran
   de connexion administrateur qui n'existe pas et ne doit pas être construit.

Limite assumée, pour mémoire : en production cette route mériterait au minimum
une limitation de débit, voire une mise en cache. Hors périmètre ici.

À ne pas confondre avec `GET /merchant/dashboard`, qui reste protégé et réservé
au commerçant propriétaire des produits — un acheteur reçoit 403.

Impacte : AGENT_DASH.

Notifié : non — à diffuser par l'orchestrateur.

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

## [17:40] Ajout `GET /merchant/products` — liste des offres du commerçant

**Ajout**, aucune rupture. Le contrat prévoit `POST /merchant/products` et
`POST /merchant/products/{id}/tiers`, mais aucun moyen de **lire** ses propres
offres. Conséquence concrète : un produit créé sans grille de paliers reste en
brouillon, n'apparaît pas dans `GET /products` (catalogue public) et devenait
donc invisible à celui-là même qui venait de le saisir — impossible de lui
ajouter une grille ensuite.

`GET /merchant/dashboard` ne comble pas ce trou : il renvoie des **groupes**, pas
des produits. Un commerçant sans groupe ouvert voyait un espace vide.

Réponse : `{ products: MerchantProductRow[] }` avec, par produit, `id`, `name`,
`unit_label`, `image_url`, `stock`, `individual_price`, `best_price`, `status`,
`tiers`, `groups_count`, `reserved_units`. Brouillons compris, cloisonné au
commerçant authentifié (403 pour un acheteur, 401 sans jeton).

Couvert par `backend/tests/test_api_merchant_products.py` (9 tests).

Impacte : AGENT_DASH uniquement. AGENT_FRONT n'est pas concerné.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [17:40] `/shared/api/types.ts` diverge de l'OpenAPI publié — demande à AGENT_FRONT

Ce n'est pas un changement de contrat : c'est un **écart constaté** entre le
fichier de types partagé et l'API réellement publiée. Le fichier a été écrit
avant la sortie de `backend/openapi.json` et n'a pas été réaligné depuis.

Écarts qui cassent un consommateur :

1. **Identifiants `string` partout** (`User.id`, `Group.id`, `Product.id`…) alors
   que l'API renvoie des entiers. Déjà tranché le [16:35] : l'OpenAPI fait foi.
2. **`ImpactStats`** : le fichier annonce `total_savings`, `active_groups_count`,
   `completed_groups_count`, `participants_count`, `total_value`. L'API renvoie
   `community_savings`, `groups_active`, `groups_successful`, `users`,
   `total_order_value`, plus `merchants`, `products`, `groups_created`,
   `success_rate`, `orders`.
3. **`SuggestTiersRequest`** : `individual_price` et `target_margin` n'existent
   pas ; l'API attend `retail_price`, `stock`, `floor_price`.
4. **`ShareMessageRequest` / `ShareMessageResponse`** : l'API prend `{group_id}`
   et renvoie `{share_url, variants: [{registre, texte}], source}`, pas
   `{variants: [{text}]}` ni les paramètres de langue et de registre. IA-2 a été
   réduite au français sur décision de l'orchestrateur ([11:44]).
5. **`MerchantDashboard`** : l'API renvoie `business_name`, `orders`, `groups`,
   `units`, `revenue_simule`, `pending_orders`, `rows[]` — pas `orders: Order[]`.
6. **`CreateGroupRequest.deadline`** : l'API attend `deadline_hours` (entier).
7. **`GroupCard`** ne porte pas `deadline` côté API, seulement `seconds_remaining`.

Mesure prise côté dashboard, sans toucher au fichier d'AGENT_FRONT : les types
d'API du dashboard vivent dans `dashboard/src/lib/api/types.ts`, alignés sur
`backend/openapi.json`. `@shared/theme/*` reste la source unique des tokens et
n'est pas dupliqué.

Demande à AGENT_FRONT : réaligner `/shared/api/types.ts` sur l'OpenAPI. Tant que
ce n'est pas fait, l'application mobile risque les mêmes erreurs silencieuses.

Impacte : AGENT_FRONT (propriétaire du fichier), AGENT_DASH (contourné).

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [18:40] Ajouts au catalogue — `best_open_group_price` et bornes de paliers

**Ajouts**, aucune rupture. Les deux portent sur des payloads **non gelés** :
seul `GroupDetail` est un `<payload_critique>`.

**1. `ProductCard.best_open_group_price: int | null`**

Prix réellement en vigueur dans le groupe ouvert le moins cher pour ce produit,
`null` s'il n'y en a aucun. `best_price` reste inchangé et garde son sens : le
dernier palier, donc une *promesse*.

AGENT_UI avait construit `ProductCard` avec une propriété `bestOpenGroupPrice`
qu'aucun champ d'API ne pouvait remplir. Il refusait — à juste titre — d'y mettre
`best_price` : cela aurait affiché une remise que personne n'avait débloquée.
La carte n'avait donc que deux issues, mentir ou ne rien montrer.

**2. `ProductDetail.tiers[].max_quantity`, via un `ProductTierOut` distinct**

La fiche produit affiche des intervalles (« 1–49 sacs »). Sans borne haute, les
quatre paliers se lisaient tous « 1+ ».

`TierOut` n'est **pas** modifié : c'est la forme gelée de `current_tier` et
`next_tier` dans `GroupDetail`. Un test vérifie explicitement que ces deux objets
gardent leurs deux champs.

Couvert par `backend/tests/test_api_catalogue_enrichi.py` (9 tests). 162 au total.

Impacte : AGENT_FRONT (les deux), AGENT_DASH (aucun — le dashboard ne lit pas
`/products`).

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [18:40] Demandes d'AGENT_UI du [13:20] — réponses

Trois manques de données avaient été signalés pour rendre l'écran groupe conforme
à la maquette. Réponses, une par une :

**1. `GroupDetail.tiers[]` — la maquette affiche 4 paliers, le payload en porte 2.**

**Non tranché, et volontairement.** `GroupDetail` est le `<payload_critique>` du
`<contrat_partage>` ; `CLAUDE.md` interdit d'arbitrer seul une contradiction dans
ce bloc. Or il y a bien contradiction : le contrat fige une liste de 20 champs
sans `tiers[]`, tout en écrivant dans le même paragraphe que le payload est
« auto-suffisant : l'écran groupe se dessine intégralement à partir de lui, sans
second appel ». Les deux ne peuvent pas être vrais si la maquette demande la
grille complète.

Ajouter `tiers[]` va dans le sens du principe et ne casse aucun consommateur.
C'est ma recommandation, mais elle appartient à l'humain. En attendant, l'écran
affiche le palier courant et le suivant — ce qui reste juste, jamais faux.

**2. Aperçu des participants (initiales ou prénoms).**

**Refusé.** Exposer le nom d'autres acheteurs à quiconque détient un lien de
partage est une décision de confidentialité, pas un détail d'affichage — et le
lien est public par conception. Les silhouettes anonymes déjà en place couvrent
le besoin visuel sans inventer d'identité ni en divulguer.

**3. Localisation du commerçant dans `product`.**

**Non ajouté à `GroupDetail`**, pour la même raison qu'au point 1 : `product` y
est un objet gelé à six champs. `merchant_location` existe déjà sur
`ProductDetail` et y est renseigné (« Tsévié » dans le jeu de démo).

Impacte : AGENT_UI, AGENT_FRONT.

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---

## [19:50] `GroupDetail.tiers[]` — tranché, ajouté

Reprend et clôt le point 1 de l'entrée [18:40], laissé à l'arbitrage humain.
**Décision prise par l'orchestrateur : ajouter le champ.**

`GroupDetail` porte désormais `tiers: ProductTierOut[]`, la grille complète du
produit avec les bornes hautes.

La contradiction était dans le contrat lui-même : `<payload_critique>` fige une
liste de 20 champs sans `tiers[]`, et le paragraphe qui l'introduit exige que le
payload soit « auto-suffisant : l'écran groupe se dessine intégralement à partir
de lui, sans second appel ». L'écran ne pouvait montrer que 2 paliers sur 4.
L'ajout tranche dans le sens du principe.

Ce qui **ne change pas** : `current_tier` et `next_tier` gardent leur forme gelée
à deux champs (`min_quantity`, `unit_price`). Un test le vérifie explicitement.

Le garde-fou de conformité passe de 20 à 21 champs — c'est lui qui a signalé le
changement au moment de l'appliquer, ce pour quoi il avait été écrit.

Impacte : AGENT_UI et AGENT_FRONT (la grille complète est disponible, plus besoin
de second appel), AGENT_DASH (aucun — le dashboard lit déjà `/products/{id}`,
qu'il peut désormais économiser s'il le souhaite).

Notifié : non — à diffuser aux autres sessions par l'orchestrateur.

---
