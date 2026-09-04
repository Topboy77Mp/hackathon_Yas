import { useCallback, useEffect, useState } from "react";

export interface AsyncResource<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  retry: () => void;
}

export function useAsyncResource<T>(load: () => Promise<T>, dependencies: readonly unknown[]): AsyncResource<T> {
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error("Une erreur est survenue."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  // Le chargeur est volontairement défini au point d'usage ; les dépendances explicites pilotent le rechargement.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, attempt]);

  return { data, error, isLoading, retry };
}
