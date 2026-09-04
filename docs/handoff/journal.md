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
[12:10] AGENT_BACK — reprise sur instruction de l'orchestrateur : les coéquipiers travaillent en local, le backend doit être prêt à accueillir leurs parties. Fin de la pause
[12:40] AGENT_BACK — fait : étape 3, auth JWT complète (`/auth/register`, `/auth/login`, `/auth/me`) + dépendances `current_user`, `require_merchant`, `require_group_creator`
[12:40] AGENT_BACK — fait : étape 5, `join` et `leave` transactionnels avec `SELECT … FOR UPDATE` sur la ligne groupe et propagation rétroactive du prix à toutes les commandes actives
[12:40] AGENT_BACK — fait : étape 6, catalogue (`/products`), commandes, paiement mocké, `/merchant/dashboard`, `/stats/impact`
[12:40] AGENT_BACK — fait : `POST /demo/simulate-joins` protégé par `X-Demo-Token`. Livrable de Phase 1 qui avait été oublié, désormais en place
[12:40] AGENT_BACK — validé : 20 joins simultanés, compteur exact (186 sacs), un seul prix en base, zéro doublon de téléphone. Le verrou de ligne tient
[12:40] AGENT_BACK — validé : franchissement de palier à 201 sacs, les 56 commandes basculent de 19 000 à 17 500 en base, y compris les 38 seedées
[12:40] AGENT_BACK — reste à faire : étape 7 (endpoints IA avec fallback déterministe), clôture de groupe à échéance (D8), `POST /merchant/products` + paliers
[12:40] AGENT_BACK — pour AGENT_FRONT et AGENT_DASH : 17 chemins publiés, `backend/openapi.json` à jour. Rien ne vous bloque côté API
[14:55] AGENT_BACK — fait : étape 7. `POST /ai/suggest-tiers` et `POST /ai/share-message`, timeout 4 s, limitation à 12 requêtes par minute, repli déterministe intégral sans clé API
[14:55] AGENT_BACK — fait : reliquat étape 6. `POST /merchant/products` et `POST /merchant/products/{id}/tiers`. Un produit sans grille valide reste en brouillon et n'apparaît pas au catalogue
[14:55] AGENT_BACK — fait : clôture D8 à l'échéance, en évaluation paresseuse à la lecture. Pas d'ordonnanceur, le contrat exclut cette complexité
[14:55] AGENT_BACK — validé : minimum atteint → groupe LOCKED, 38 commandes CONFIRMED. Minimum non atteint → groupe CANCELLED, commande CANCELLED/REFUNDED, paiement REFUNDED, notification émise
[14:55] AGENT_BACK — validé : les trois grilles interdites par le cahier des charges sont rejetées (prix croissant, chevauchement, dernier palier fermé)
[14:55] AGENT_BACK — validé : IA-1 renvoie le palier 1 au prix de détail 3 fois sur 3. Sans ce correctif, les deux modèles le bradaient systématiquement — `validate_tiers` ne rattrape pas cet invariant, qui n'est pas au contrat
[14:55] AGENT_BACK — non-régression : 146 → 200 sacs, 19 000 → 17 500, économie communautaire 900 000 FCFA, un seul prix en base. Chiffre identique à celui du contrat
[14:55] AGENT_BACK — l'API couvre désormais les 18 endpoints du contrat, plus `/demo/simulate-joins` et `/orders/{id}`. Étapes 1 à 7 terminées
[14:55] AGENT_BACK — attend : la fusion de `back/phase-2` sur `main` par l'intégrateur. `UI` et `dash/phase-1a` sont toujours au commit zéro
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
