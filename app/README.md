# KashFlow — app acheteur

Expo + expo-router (mobile et web).

## Démarrage

    npx expo start

- Web : touche `w`, ou http://localhost:8081
- Mobile : scanner le QR code avec Expo Go

## Écran de démo

    http://localhost:8081/g/KOVIE2026

## Variables d'environnement

- `EXPO_PUBLIC_USE_MOCKS` (défaut `true`) : `false` pour brancher l'API réelle au lieu des fixtures
- `EXPO_PUBLIC_API_BASE_URL` (défaut `http://localhost:8000`)

## Structure

    app/            routes (expo-router)
    components/ui/  composants primitifs (AGENT_UI)
    features/       écrans (AGENT_FRONT)
    lib/            API, fixtures, hooks
