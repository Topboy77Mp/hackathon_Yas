# Vérification du projet — 5 septembre 2026

Verdict : les suites existantes passent, mais le projet n’est pas entièrement opérationnel.

| Vérification exécutée | Résultat |
| --- | --- |
| Backend : `.venv313/Scripts/python.exe -m pytest -p no:cacheprovider` | 153 tests réussis en 58,80 s |
| Dashboard : `node --import ./tests/register.mjs --test --test-isolation=none ./tests/management.test.mjs` | 13 tests réussis |
| Dashboard : `npm run build` | TypeScript et bundle Vite réussis |
| Contrôle supplémentaire : remplacement de paliers sur un produit avec commandes actives | Incohérence reproduite |

## Bug métier prioritaire

POST `/merchant/products/{id}/tiers` accepte une nouvelle grille avec un prix de 18 000 FCFA à partir de 100 unités. Le groupe existant de 146 sacs affiche alors 18 000 FCFA, mais ses commandes restent à 19 000 FCFA, de même que la ligne de l’agrégat commerçant. Les prix et les économies deviennent incohérents entre écrans.

Reproduction indépendante sur SQLite de test, depuis la racine :

```powershell
backend/.venv313/Scripts/python.exe dashboard/tests/backend_pricing_probe.py
```

Ce contrôle échoue volontairement tant que l’invariant n’est pas rétabli. Il réutilise les fixtures de test, sans modifier la base de démonstration. Le backend doit soit refuser la modification en présence de commandes actives, soit recalculer transactionnellement toutes les commandes et agrégats concernés. Le correctif relève du backend ; aucun fichier métier backend n’a été modifié pendant cette vérification.

## Ce que les tests confirment

Les suites couvrent notamment les calculs de paliers, la création de produits, les listes privées commerçant, l’inscription/connexion API, les contrôles d’accès, les participations aux groupes, les commandes individuelles, les paiements simulés, les échéances et remboursements simulés, les statistiques et les replis des assistants. Les 13 tests dashboard couvrent les adaptateurs et mutations locales, pas les clics dans React.

## Limites

- Administration des utilisateurs/boutiques, mutations produit manquantes et livraison restent des simulations locales ou des parcours indisponibles en mode API : voir `INTEGRATION.md`.
- Pas de navigateur disponible dans l’outil (inventaire vide). Aucun parcours visuel, clavier ou mobile n’a été validé lors de cette exécution.
- Tests backend sur SQLite isolée : ils ne valident pas les verrous et la concurrence PostgreSQL ni un déploiement réel.
- Application acheteur Expo non compilée : ses dépendances locales ne sont pas installées. Aucun test de fonctionnement sur téléphone effectué.
- 137 avertissements backend, principalement dépréciations de dépendances et cache pytest non inscriptible ; aucun échec dans la suite existante.

Priorité avant de poursuivre : corriger l’incohérence de remplacement des paliers, puis vérifier les parcours réels dans un navigateur et sur téléphone.
