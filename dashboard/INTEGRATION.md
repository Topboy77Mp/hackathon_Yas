# Dashboard KashFlow : raccordement et vérification

## Démarrage

Dans `dashboard`, ex?cuter `npm run dev`. Le dashboard s?ouvre directement, sans page de connexion. Sans session existante, il initialise le compte administrateur de d?monstration locale. Une session r?elle d?j? pr?sente reste v?rifi?e via `/auth/me` et conserve ses autorisations. Les anciennes routes `/connexion` et `/demo/connexion` redirigent vers `/`. Le bouton de d?connexion est absent en d?monstration ; quitter une session API ouvre la d?monstration locale explicitement signal?e.
