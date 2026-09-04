/**
 * KashFlow — Configuration de l'app acheteur.
 * USE_MOCKS=true tant qu'AGENT_BACK n'a pas livré l'API : tout passe par lib/fixtures.ts.
 * Bascule via la variable d'env EXPO_PUBLIC_USE_MOCKS ("false" pour brancher l'API réelle).
 */

export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const GROUP_POLL_INTERVAL_MS = 2000;
