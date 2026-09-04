import type { CSSProperties } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { CreateOfferPage } from "./pages/CreateOfferPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ImpactPage } from "./pages/ImpactPage";
import { MerchantLoginPage } from "./pages/MerchantLoginPage";
import { OffersPage } from "./pages/OffersPage";
import { themeVariables } from "./lib/theme";

export function App() {
  return (
    <div className="app" style={themeVariables as CSSProperties}>
      <header className="app-header">
        <div className="header-content">
          <NavLink className="brand" to="/offres" aria-label="KashFlow, accueil du dashboard">
            <span>KashFlow</span><span className="brand-context">Pro</span>
          </NavLink>
          <nav aria-label="Navigation principale">
            <NavLink className="nav-link" to="/offres">Mes offres</NavLink>
            <NavLink className="nav-link" to="/impact">
              Impact
            </NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/connexion" element={<MerchantLoginPage />} />
          <Route path="/offres" element={<OffersPage />} />
          <Route path="/offres/nouvelle" element={<CreateOfferPage />} />
          <Route path="/offres/:offerId" element={<CreateOfferPage />} />
          <Route path="/groupes/:groupId" element={<GroupDetailPage />} />
          <Route path="*" element={<Navigate replace to="/offres" />} />
        </Routes>
      </main>
    </div>
  );
}
