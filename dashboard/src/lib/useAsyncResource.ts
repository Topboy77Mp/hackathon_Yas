import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncResource<T> {
  data: T | null;
  error: Error | null;
  /** Vrai uniquement au premier chargement, quand l'écran est encore vide. */
  isLoading: boolean;
  /** Vrai pendant un rafraîchissement, quand des données sont déjà affichées. */
  isRefreshing: boolean;
  refresh: () => void;
}

interface Options {
  /** Cadence de rafraîchissement automatique, en millisecondes. 0 = désactivé. */
  pollMs?: number;
}

/**
 * Chargement asynchrone avec rechargement manuel et scrutation optionnelle.
 *
 * Deux points décisifs pour la démonstration :
 * — un rafraîchissement ne repasse **jamais** l'écran en état de chargement.
 *   Une première version le faisait : après une simulation, la page groupe se
 *   vidait, le panneau de démonstration était démonté et son résultat perdu.
 *   Seul le tout premier chargement affiche l'écran d'attente ;
 * — la scrutation se met en pause quand l'onglet passe en arrière-plan, pour ne
 *   pas marteler l'API pendant une présentation.
 */
export function useAsyncResource<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
  { pollMs = 0 }: Options = {},
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Le chargeur est redéfini à chaque rendu au point d'usage ; le garder dans
  // une ref évite de relancer l'effet à chaque rendu du parent.
  const loadRef = useRef(load);
  loadRef.current = load;

  const actif = useRef(true);
  const aDesDonnees = useRef(false);
  const requestVersion = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    actif.current = true;
    return () => { actif.current = false; requestVersion.current += 1; };
  }, []);

  const executer = useCallback(async (arrierePlan: boolean) => {
    if (arrierePlan && pending.current) return;
    const version = ++requestVersion.current;
    pending.current = true;
    if (arrierePlan) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const resultat = await loadRef.current();
      if (!actif.current || version !== requestVersion.current) return;
      setData(resultat);
      setError(null);
      aDesDonnees.current = true;
    } catch (raison) {
      if (!actif.current || version !== requestVersion.current) return;
      const echec = raison instanceof Error ? raison : new Error("Une erreur est survenue.");
      // Un échec de rafraîchissement ne doit pas effacer ce qui est affiché.
      setError(echec);
    } finally {
      if (!actif.current || version !== requestVersion.current) return;
      pending.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Premier chargement, et rechargement complet quand les dépendances changent.
  useEffect(() => {
    aDesDonnees.current = false;
    setData(null);
    setError(null);
    void executer(false);
    // Les dépendances sont déclarées explicitement au point d'usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  // Rafraîchissement manuel : en arrière-plan, sans vider l'écran.
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (attempt === 0) return; // le montage est déjà couvert par l'effet ci-dessus
    void executer(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Scrutation.
  useEffect(() => {
    if (pollMs <= 0) return;
    const minuteur = window.setInterval(() => {
      if (document.visibilityState === "visible") void executer(true);
    }, pollMs);
    return () => window.clearInterval(minuteur);
  }, [pollMs, executer]);

  return { data, error, isLoading, isRefreshing, refresh };
}
