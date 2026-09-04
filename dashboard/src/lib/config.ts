export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

/** Les fixtures restent actives tant que le backend Phase 2 n'est pas livré. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";
