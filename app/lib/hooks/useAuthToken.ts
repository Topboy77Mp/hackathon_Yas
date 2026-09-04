import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, subscribeToToken } from '../api/auth-storage';

/**
 * État d'authentification, réactif.
 *
 * Un changement de jeton invalide le cache React Query : les données de la
 * session précédente ne doivent jamais rester à l'écran après une déconnexion,
 * et `my_membership` doit apparaître dès la connexion sans rechargement manuel.
 */
export function useAuthToken() {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let monté = true;

    getToken().then((valeur) => {
      if (!monté) return;
      setTokenState(valeur);
      setIsLoading(false);
    });

    const désabonner = subscribeToToken((valeur) => {
      if (!monté) return;
      setTokenState(valeur);

      if (valeur === null) {
        // Déconnexion : on vide le cache au lieu de l'invalider. Invalider
        // relançait immédiatement les requêtes encore montées — `/auth/me` en
        // tête — désormais sans jeton, ce qui produisait un 401 en console à
        // chaque déconnexion.
        queryClient.clear();
      } else {
        // Connexion : les données publiques déjà en cache doivent être
        // rechargées avec l'identité, c'est elle qui remplit `my_membership`.
        void queryClient.invalidateQueries();
      }
    });

    return () => {
      monté = false;
      désabonner();
    };
  }, [queryClient]);

  return { token, isAuthenticated: token !== null, isLoading };
}
