# Dashboard KashFlow : raccordement et vérification

## Démarrage

Dans `dashboard`, exécuter `npm run dev`. Le dashboard s’ouvre directement, sans page de connexion. Sans session existante, il initialise le compte administrateur de démonstration locale. Une session réelle déjà présente reste vérifiée via `/auth/me` et conserve ses autorisations. Les anciennes routes `/connexion` et `/demo/connexion` redirigent vers `/`. Le bouton de déconnexion est absent en démonstration ; quitter une session API ouvre la démonstration locale explicitement signalée.
