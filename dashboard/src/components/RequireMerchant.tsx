import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/useSession";

/**
 * Sans cette garde, une page protégée s'affichait puis se remplissait d'erreurs
 * 403 une fois les appels partis. On redirige avant de monter la page.
 */
export function RequireMerchant({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/connexion" />;
  }
  return <>{children}</>;
}
