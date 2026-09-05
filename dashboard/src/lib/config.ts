export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/** Cadence de rafraîchissement de l'écran groupe, en millisecondes. */
export const POLL_INTERVAL_MS = 3000;
