/**
 * KashFlow — Configuration de l'app acheteur.
 *
 * Plus de mode maquette : l'application affiche ce que l'API renvoie, ou une
 * erreur. Un backend arrêté doit se voir immédiatement plutôt que de laisser
 * croire, devant un jury, que des chiffres inventés sont réels.
 *
 * `EXPO_PUBLIC_API_BASE_URL` doit pointer sur une adresse joignable depuis
 * l'appareil : `localhost` ne fonctionne que pour la cible web et l'émulateur.
 * Depuis un téléphone, mettre l'IP locale de la machine (ex. http://192.168.1.12:8000).
 */

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

/** D6 : l'écran groupe interroge l'API toutes les 2 s au premier plan. */
export const GROUP_POLL_INTERVAL_MS = 2000;
