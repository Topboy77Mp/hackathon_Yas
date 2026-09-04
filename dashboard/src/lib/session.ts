/**
 * Session commerçant : jeton JWT et identité, conservés d'un rechargement à l'autre.
 *
 * Le `localStorage` seul ne suffisait pas : quand l'API répond 401 (jeton expiré),
 * la page en cours doit se vider et rendre la main à l'écran de connexion. Un
 * abonnement minimal évite d'imposer un contexte React à toute l'application.
 */

import type { UserOut } from "./api/types";

const TOKEN_KEY = "kashflow.dashboard.token";
const USER_KEY = "kashflow.dashboard.user";

export interface Session {
  token: string;
  user: UserOut;
}

type Listener = (session: Session | null) => void;

const listeners = new Set<Listener>();

function read(): Session | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const raw = window.localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as UserOut };
  } catch {
    // Entrée corrompue : on repart d'une session vide plutôt que de planter.
    return null;
  }
}

let current: Session | null = read();

function publish(): void {
  for (const listener of listeners) listener(current);
}

export function getSession(): Session | null {
  return current;
}

export function getAuthToken(): string | null {
  return current?.token ?? null;
}

export function openSession(session: Session): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  current = session;
  publish();
}

export function closeSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  current = null;
  publish();
}

export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
