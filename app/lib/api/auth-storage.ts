/**
 * KashFlow — Stockage du JWT.
 * AsyncStorage suffit pour un hackathon : pas de besoin de secure enclave ici.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'kashflow.auth.token';

let inMemoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (inMemoryToken !== null) return inMemoryToken;
  inMemoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return inMemoryToken;
}

export async function setToken(token: string | null): Promise<void> {
  inMemoryToken = token;
  if (token === null) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}
