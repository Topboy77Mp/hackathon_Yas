import type { CSSProperties } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { CreateOfferPage } from "./pages/CreateOfferPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ImpactPage } from "./pages/ImpactPage";
import { MerchantLoginPage } from "./pages/MerchantLoginPage";
import { OffersPage } from "./pages/OffersPage";
import { OverviewPage } from "./pages/OverviewPage";
import { DashboardIcon } from "./pages/DashboardIcon";
import { themeVariables } from "./lib/theme";

export function App() {
  const location = useLocation();
  const pageTitle = location.pathname === "/" ? "Vue d’ensemble" : location.pathname === "/impact" ? "Impact" : location.pathname.startsWith("/groupes") ? "Groupes" : location.pathname.startsWith("/offres/nouvelle") ? "Créer une offre" : "Offres";

  return (
    <div className="app" style={themeVariables as CSSProperties}>
      <aside className="sidebar">
        <NavLink className="sidebar-brand" to="/" aria-label="KashFlow, vue d’ensemble"><span>Kash</span><strong>Flow</strong></NavLink>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          <NavLink end to="/"><DashboardIcon name="grid" />Vue d’ensemble</NavLink>
          <NavLink to="/offres"><DashboardIcon name="tag" />Offres</NavLink>
          <NavLink to="/groupes/kov-2026"><DashboardIcon name="users" />Groupes</NavLink>
          <NavLink to="/offres"><DashboardIcon name="cart" />Commandes</NavLink>
          <NavLink to="/offres"><DashboardIcon name="card" />Paiements</NavLink>
          <NavLink to="/impact"><DashboardIcon name="chart" />Impact</NavLink>
        </nav>
        <div className="sidebar-footer"><button type="button"><DashboardIcon name="help" />Aide et support</button><NavLink to="/connexion"><DashboardIcon name="logout" />Déconnexion</NavLink></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><h1>{pageTitle}</h1><div className="topbar-actions"><button className="icon-button" aria-label="Notifications" type="button"><DashboardIcon name="bell" /></button><span className="avatar">AZ</span><span className="greeting">Bonjour, Agro-Intrants Zio</span><DashboardIcon name="chevron" /></div></header>
      <main className="workspace-main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/connexion" element={<MerchantLoginPage />} />
          <Route path="/offres" element={<OffersPage />} />
          <Route path="/offres/nouvelle" element={<CreateOfferPage />} />
          <Route path="/offres/:offerId" element={<CreateOfferPage />} />
          <Route path="/groupes/:groupId" element={<GroupDetailPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main></div>
    </div>
  );
}
