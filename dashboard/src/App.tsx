import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutlineOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import { themeVariables } from './lib/theme';
import { useSession } from './lib/useSession';
import { closeSession, openSession } from './lib/session';
import { api } from './lib/api/client';
import type { UserOut } from './lib/api/types';
import { demoLogin, isDemo } from './lib/demo';
import { useAsyncResource } from './lib/useAsyncResource';
import { ManagementPage, ManagementOverview, ManagedGroupPage, ProductFormPage, TierFormPage } from './pages/ManagementPages';
import { Notice } from './pages/ManagementUI';

const adminNav = [['/', 'Vue d’ensemble', DashboardOutlined], ['/utilisateurs', 'Utilisateurs', PeopleOutline], ['/commercants', 'Commerçants', StorefrontOutlined], ['/produits', 'Produits', Inventory2Outlined], ['/groupes', 'Groupes', GroupsOutlined], ['/commandes', 'Commandes', ReceiptLongOutlined]] as const;
const merchantNav = [['/', 'Vue d’ensemble', DashboardOutlined], ['/boutique', 'Ma boutique', StorefrontOutlined], ['/produits', 'Produits', Inventory2Outlined], ['/offres', 'Offres', SellOutlined], ['/commandes', 'Commandes', ReceiptLongOutlined]] as const;

function DashboardEntry() {
  const session = useSession();
  useEffect(() => {
    if (!session) openSession(demoLogin('admin', 'demo'));
  }, [session]);
  return session ? <AuthorizedShell key={session.token} /> : <p role="status">Ouverture du dashboard?</p>;
}
function AuthorizedShell() {
  const session = useSession();
  const verified = useAsyncResource(async () => {
    if (!session) return null;
    if (isDemo()) { const account = demoLogin(session.user.phone, 'demo'); if (account.token !== session.token || account.user.role !== session.user.role) throw new Error('Session invalide.'); return account.user; }
    const user = await api<UserOut>('/auth/me');
    if (JSON.stringify(user) !== JSON.stringify(session.user)) openSession({...session, user});
    return user;
  }, [session?.token]);
  if (!session) return null;
  if (verified.isLoading) return <p className="login" role="status">Vérification du compte…</p>;
  if (verified.error || !verified.data || verified.data.role === 'USER') return <div className="login"><h1>Accès indisponible</h1><p role="alert">{verified.error?.message ?? 'Un compte administrateur ou commerçant est requis.'}</p><button onClick={verified.refresh}>Réessayer</button><button onClick={closeSession}>Se déconnecter</button></div>;
  return <Shell key={`${session.token}:${verified.data.role}`} admin={verified.data.role === 'ADMIN'} />;
}
function Shell({admin}: {admin: boolean}) {
  const session = useSession()!; const [mobile, setMobile] = useState(false); const path = useLocation().pathname;
  const nav = admin ? adminNav : merchantNav;
  const title = nav.find(([href]) => href !== '/' && path.startsWith(href))?.[1] ?? (path.startsWith('/groupes/') ? 'Détail du groupe' : 'Vue d’ensemble');
  return <div className="workspace"><a className="skip-link" href="#main">Aller au contenu</a><aside className={`sidebar ${mobile ? 'is-open' : ''}`}><Link className="brand" to="/" onClick={() => setMobile(false)} aria-label="KashFlow ? accueil"><img className="brand-logo" src="/kashflow-logo.png" alt="KashFlow" width="1774" height="887" /></Link><p className="space-label">{admin ? 'Administration' : 'Espace commerçant'}</p><nav aria-label="Navigation principale">{nav.map(([href, label, Icon]) => <NavLink end={href === '/'} key={href} to={href} onClick={() => setMobile(false)}><Icon fontSize="small" /><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer">Achats groupés<br/><span>Des volumes partagés, des paiements individuels.</span></div></aside><div className="workspace-body"><header className="workspace-header"><button className="menu-toggle" aria-expanded={mobile} onClick={() => setMobile(!mobile)}>Menu</button><h1>{title}</h1><div className="account"><span>{session.user.first_name} {session.user.last_name}<small>{admin ? 'Administrateur' : 'Commerçant'}</small></span><button onClick={closeSession}>Déconnexion</button></div></header><main id="main" tabIndex={-1}>{isDemo() && <Notice><strong>Démonstration locale</strong> · Données fictives et actions simulées, enregistrées uniquement dans ce navigateur.</Notice>}<Outlet /></main></div></div>;
}
function RolePage({adminOnly = false, merchantOnly = false, children}: {adminOnly?: boolean; merchantOnly?: boolean; children: ReactNode}) {const role = useSession()?.user.role; return (adminOnly && role !== 'ADMIN') || (merchantOnly && role !== 'MERCHANT') ? <Navigate to="/" replace /> : children;}
export function App() {return <div className="app" style={themeVariables as CSSProperties}><Routes><Route path="/connexion" element={<Navigate to="/" replace />} /><Route path="/demo/connexion" element={<Navigate to="/" replace />} /><Route element={<DashboardEntry />}><Route index element={<ManagementOverview />} />{[['utilisateurs', 'users'], ['commercants', 'shops'], ['groupes', 'groups']].map(([path, kind]) => <Route key={path} path={path} element={<RolePage adminOnly><ManagementPage key={kind} kind={kind as 'users' | 'shops' | 'groups'} /></RolePage>} />)}<Route path="boutique" element={<RolePage merchantOnly><ManagementPage kind="shops" key="boutique" /></RolePage>} /><Route path="produits" element={<ManagementPage kind="products" key="products" />} /><Route path="offres" element={<RolePage merchantOnly><ManagementPage kind="products" offers key="offers" /></RolePage>} /><Route path="commandes" element={<ManagementPage kind="orders" key="orders" />} /><Route path="groupes/:groupId" element={<ManagedGroupPage />} /><Route path="produits/nouveau" element={<RolePage merchantOnly><ProductFormPage /></RolePage>} /><Route path="produits/:productId/modifier" element={<ProductFormPage />} /><Route path="offres/nouvelle" element={<RolePage merchantOnly><ProductFormPage offer /></RolePage>} /><Route path="offres/:productId/paliers" element={<RolePage merchantOnly><TierFormPage /></RolePage>} /><Route path="impact" element={<RolePage adminOnly><ManagementOverview /></RolePage>} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></div>;}
