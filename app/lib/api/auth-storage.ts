/**
 * KashFlow — Stockage du JWT.
 * AsyncStorage suffit pour un hackathon : pas de besoin de secure enclave ici.
 *
 * Les abonnés sont notifiés à chaque changement. Sans cela, un écran déjà monté
 * gardait son état d'authentification d'origine : après une déconnexion depuis
 * le profil, ou après l'expiration du jeton purgée par le client HTTP, l'écran
 * groupe continuait d'afficher « Rejoindre » comme si l'utilisateur était connecté.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'kashflow.auth.token';

type Listener = (token: string | null) => void;

let inMemoryToken: string | null = null;
let chargé = false;
const listeners = new Set<Listener>();

export async function getToken(): Promise<string | null> {
  if (chargé) return inMemoryToken;
  inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  chargé = true;
  return inMemoryToken;
}

export async function setToken(token: string | null): Promise<void> {
  inMemoryToken = token;
  chargé = true;

  if (token === null) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  for (const listener of listeners) listener(token);
}

export function subscribeToToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
