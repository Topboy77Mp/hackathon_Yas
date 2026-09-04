export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/**
 * Jeton du simulateur de démonstration (`POST /demo/simulate-joins`).
 * Doit correspondre au `DEMO_TOKEN` du backend. Vide = panneau masqué.
 */
export const DEMO_TOKEN = import.meta.env.VITE_DEMO_TOKEN ?? "";

/** Cadence de rafraîchissement de l'écran groupe, en millisecondes. */
export const POLL_INTERVAL_MS = 3000;
