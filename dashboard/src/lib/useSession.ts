import { useEffect, useState } from "react";
import { getSession, subscribeToSession, type Session } from "./session";

/** Rend l'interface sensible à une session fermée par un 401 du client HTTP. */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(getSession);
  useEffect(() => subscribeToSession(setSession), []);
  return session;
}
