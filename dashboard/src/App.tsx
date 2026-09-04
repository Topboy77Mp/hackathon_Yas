import type { CSSProperties } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { NotificationBell } from "./components/NotificationBell";
import { RequireMerchant } from "./components/RequireMerchant";
import { themeVariables } from "./lib/theme";
import { closeSession } from "./lib/session";
import { useSession } from "./lib/useSession";
import { CreateOfferPage } from "./pages/CreateOfferPage";
import { EditTiersPage } from "./pages/EditTiersPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ImpactPage } from "./pages/ImpactPage";
import { MerchantLoginPage } from "./pages/MerchantLoginPage";
import { OffersPage } from "./pages/OffersPage";

function Header() {
  const session = useSession();
  const navigate = useNavigate();

  function seDeconnecter() {
    closeSession();
    navigate("/connexion", { replace: true });
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <NavLink className="brand" to="/offres" aria-label="KashFlow, accueil du dashboard">
          KashFlow
        </NavLink>

        <nav aria-label="Navigation principale">
          {session && <NavLink className="nav-link" to="/offres">Mes offres</NavLink>}
          <NavLink className="nav-link" to="/impact">Impact</NavLink>

          {session ? (
            <div className="header-account">
              <NotificationBell />
              <span className="header-identity">{session.user.first_name}</span>
              <button className="nav-link nav-signout" onClick={seDeconnecter} type="button">
                Déconnexion
              </button>
            </div>
          ) : (
            <NavLink className="nav-link" to="/connexion">Connexion</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <div className="app" style={themeVariables as CSSProperties}>
      <Header />
      <main>
        <Routes>
          {/* Publique : c'est la page que le jury regarde, elle ne dépend d'aucune session. */}
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/connexion" element={<MerchantLoginPage />} />

          <Route
            path="/offres"
            element={<RequireMerchant><OffersPage /></RequireMerchant>}
          />
          <Route
            path="/offres/nouvelle"
            element={<RequireMerchant><CreateOfferPage /></RequireMerchant>}
          />
          <Route
            path="/offres/:productId/paliers"
            element={<RequireMerchant><EditTiersPage /></RequireMerchant>}
          />
          <Route
            path="/groupes/:groupId"
            element={<RequireMerchant><GroupDetailPage /></RequireMerchant>}
          />

          <Route path="*" element={<Navigate replace to="/offres" />} />
        </Routes>
      </main>
    </div>
  );
}
