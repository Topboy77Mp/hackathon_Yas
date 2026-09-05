/**
 * Retour arrière sûr.
 *
 * `router.back()` échoue quand il n'y a rien derrière : c'est le cas d'un écran
 * ouvert directement — un lien de groupe partagé sur WhatsApp, un rechargement
 * de l'application, une notification. React Navigation émet alors
 * « The action 'GO_BACK' was not handled by any navigator » et **le bouton ne
 * fait rien** : l'utilisateur se retrouve enfermé dans l'écran.
 *
 * Le repli renvoie à l'accueil plutôt que nulle part.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';

export function useRetour(repli: Parameters<ReturnType<typeof useRouter>['replace']>[0] = '/') {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(repli);
  }, [router, repli]);
}
