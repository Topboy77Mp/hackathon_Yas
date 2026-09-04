import type { CSSProperties } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import SellOutlined from "@mui/icons-material/SellOutlined";
import { AppBar, Avatar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { colors } from "@shared/theme/tokens";
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
import { OverviewPage } from "./pages/OverviewPage";

const drawerWidth = 258;
const navigation = [
  { label: "Vue d’ensemble", path: "/", icon: <DashboardRounded /> },
  { label: "Offres", path: "/offres", icon: <SellOutlined /> },
  { label: "Impact", path: "/impact", icon: <AssessmentOutlined /> },
];

function Sidebar() {
  const session = useSession();
  const navigate = useNavigate();
  function signOut() { closeSession(); navigate("/connexion", { replace: true }); }

  return <Drawer sx={{ width: drawerWidth, flexShrink: 0, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", border: 0, color: "common.white", backgroundColor: colors.accent.navy } }} variant="permanent"><Box sx={{ display: "flex", height: "100%", flexDirection: "column", px: 2.25, py: 4 }}><Typography component={NavLink} to="/" variant="h4" sx={{ color: "common.white", fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1, textDecoration: "none" }}>Kash<Box component="span" sx={{ color: "secondary.main" }}>Flow</Box></Typography><List sx={{ display: "grid", gap: 0.75, mt: 5 }}>{navigation.map((item) => <ListItemButton component={NavLink} key={item.label} to={item.path} sx={{ borderRadius: 1, color: "common.white", minHeight: 56, "&.active": { bgcolor: "primary.main" }, "&:hover": { bgcolor: "action.hover" }, "&.active:hover": { bgcolor: "primary.main" } }}><ListItemIcon sx={{ color: "inherit", minWidth: 46 }}>{item.icon}</ListItemIcon><ListItemText primary={<Typography sx={{ fontWeight: 500 }}>{item.label}</Typography>} /></ListItemButton>)}</List><Box sx={{ mt: "auto" }}><Divider sx={{ borderColor: "primary.main", mb: 2 }} /><List disablePadding sx={{ display: "grid", gap: 0.75 }}><ListItemButton sx={{ borderRadius: 1, color: "common.white" }}><ListItemIcon sx={{ color: "inherit", minWidth: 46 }}><HelpOutlineRounded /></ListItemIcon><ListItemText primary="Aide et support" /></ListItemButton>{session && <ListItemButton onClick={signOut} sx={{ borderRadius: 1, color: "common.white" }}><ListItemIcon sx={{ color: "inherit", minWidth: 46 }}><LogoutRounded /></ListItemIcon><ListItemText primary="Déconnexion" /></ListItemButton>}</List></Box></Box></Drawer>;
}

function Header() {
  const location = useLocation();
  const session = useSession();
  const title = location.pathname === "/impact" ? "Impact" : location.pathname.startsWith("/groupes") ? "Groupe" : location.pathname.startsWith("/offres/nouvelle") ? "Créer une offre" : location.pathname.startsWith("/offres") ? "Offres" : "Vue d’ensemble";
  return <AppBar color="inherit" elevation={0} position="static" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}><Toolbar sx={{ minHeight: "88px !important", px: "36px !important" }}><Typography component="h1" sx={{ flexGrow: 1 }} variant="h4">{title}</Typography>{session ? <><Box sx={{ mr: 1.5 }}><NotificationBell /></Box><IconButton aria-label="Notifications" sx={{ display: "none" }}><NotificationsNoneRounded /></IconButton><Avatar sx={{ bgcolor: "primary.main", fontWeight: 700 }}>{session.user.first_name.slice(0, 1)}{session.user.last_name.slice(0, 1)}</Avatar><Typography sx={{ ml: 1.5, fontWeight: 500 }}>Bonjour, {session.user.first_name}</Typography></> : <Button component={NavLink} to="/connexion" variant="text">Connexion</Button>}</Toolbar></AppBar>;
}

export function App() {
  return <Box className="app" style={themeVariables as CSSProperties} sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}><Sidebar /><Box sx={{ minWidth: 0, flexGrow: 1 }}><Header /><Box component="main" sx={{ width: "min(100% - 72px, 1280px)", mx: "auto", py: 2.25 }}><Routes><Route path="/impact" element={<ImpactPage />} /><Route path="/connexion" element={<MerchantLoginPage />} /><Route path="/" element={<RequireMerchant><OverviewPage /></RequireMerchant>} /><Route path="/offres" element={<RequireMerchant><OffersPage /></RequireMerchant>} /><Route path="/offres/nouvelle" element={<RequireMerchant><CreateOfferPage /></RequireMerchant>} /><Route path="/offres/:productId/paliers" element={<RequireMerchant><EditTiersPage /></RequireMerchant>} /><Route path="/groupes/:groupId" element={<RequireMerchant><GroupDetailPage /></RequireMerchant>} /><Route path="*" element={<Navigate replace to="/" />} /></Routes></Box></Box></Box>;
}
