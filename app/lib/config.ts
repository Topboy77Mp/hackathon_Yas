/**
 * KashFlow — Configuration de l'app acheteur.
 *
 * Plus de mode maquette : l'application affiche ce que l'API renvoie, ou une
 * erreur. Un backend arrêté doit se voir immédiatement plutôt que de laisser
 * croire, devant un jury, que des chiffres inventés sont réels.
 *
 * ── L'adresse de l'API, et le piège de `localhost` ──────────────────────────
 *
 * Sur un téléphone, `localhost` désigne **le téléphone lui-même**, pas la
 * machine de développement. Une application compilée en APK avec `localhost`
 * pour cible ne joint donc jamais l'API : elle affiche « Connexion impossible »
 * sur tous les écrans, sans que rien n'indique pourquoi.
 *
 * Trois cas, dans cet ordre de priorité :
 *
 * 1. `EXPO_PUBLIC_API_BASE_URL` est renseignée → elle gagne, toujours.
 *    C'est **obligatoire pour un APK** : au moment du build, il n'y a plus de
 *    serveur de développement d'où déduire quoi que ce soit.
 * 2. Cible web → `localhost` convient : le navigateur tourne sur la machine.
 * 3. Développement natif (Expo Go, build de développement) → l'adresse est
 *    déduite de l'hôte Metro auquel l'application est déjà connectée. C'est la
 *    même machine que celle qui fait tourner l'API, donc l'IP est la bonne.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT_API = 8000;

/** Hôte du serveur Metro : « 192.168.1.12:8081 » en développement natif. */
function hoteMetro(): string | null {
  const brut =
    Constants.expoConfig?.hostUri ??
    // Champ historique, encore présent dans certains contextes Expo Go.
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  const hote = brut?.split(':')[0]?.trim();
  return hote && hote !== 'localhost' && hote !== '127.0.0.1' ? hote : null;
}

function resoudreUrlApi(): string {
  const explicite = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicite) return explicite.replace(/\/$/, '');

  if (Platform.OS !== 'web') {
    const hote = hoteMetro();
    if (hote) return `http://${hote}:${PORT_API}`;
  }

  return `http://localhost:${PORT_API}`;
}

export const API_BASE_URL = resoudreUrlApi();

/**
 * Vrai quand l'application tourne sur un appareil en visant `localhost` : la
 * configuration est alors certainement fausse. Sert à afficher un diagnostic
 * utile plutôt qu'une erreur réseau opaque.
 */
export const API_INJOIGNABLE_DEPUIS_APPAREIL =
  Platform.OS !== 'web' && API_BASE_URL.includes('localhost');

/** D6 : l'écran groupe interroge l'API toutes les 2 s au premier plan. */
export const GROUP_POLL_INTERVAL_MS = 2000;
