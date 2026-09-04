import { useMemo } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import SellOutlined from "@mui/icons-material/SellOutlined";
import { colors } from "@shared/theme/tokens";
import { CreateOfferPage } from "./pages/CreateOfferPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ImpactPage } from "./pages/ImpactPage";
import { MerchantLoginPage } from "./pages/MerchantLoginPage";
import { OffersPage } from "./pages/OffersPage";
import { OverviewPage } from "./pages/OverviewPage";

const drawerWidth = 258;

const navigation = [
  { label: "Vue d’ensemble", path: "/", icon: <DashboardRounded /> },
  { label: "Offres", path: "/offres", icon: <SellOutlined /> },
  { label: "Groupes", path: "/groupes/kov-2026", icon: <GroupOutlined /> },
  { label: "Commandes", path: "/offres", icon: <ShoppingCartOutlined /> },
  { label: "Paiements", path: "/offres", icon: <PaymentsOutlined /> },
  { label: "Impact", path: "/impact", icon: <AssessmentOutlined /> },
];

function Sidebar() {
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          border: 0,
          color: "common.white",
          backgroundColor: colors.accent.navy,
        },
      }}
      variant="permanent"
    >
      <Box sx={{ display: "flex", height: "100%", flexDirection: "column", px: 2.25, py: 4 }}>
        <Typography component={NavLink} to="/" variant="h4" sx={{ color: "common.white", fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1, textDecoration: "none" }}>
          Kash<Box component="span" sx={{ color: "secondary.main" }}>Flow</Box>
        </Typography>
        <List sx={{ display: "grid", gap: 0.75, mt: 5 }}>
          {navigation.map((item) => <ListItemButton
            component={NavLink}
            key={item.label}
            to={item.path}
            sx={{ borderRadius: 1, color: "common.white", minHeight: 56, "&.active": { bgcolor: "primary.main", color: "common.white" }, "&:hover": { bgcolor: "action.hover" }, "&.active:hover": { bgcolor: "primary.main" } }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 46 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontWeight: 500 }}>{item.label}</Typography>} />
          </ListItemButton>)}
        </List>
        <Box sx={{ mt: "auto" }}>
          <Divider sx={{ borderColor: "primary.main", mb: 2 }} />
          <List disablePadding sx={{ display: "grid", gap: 0.75 }}>
            <ListItemButton sx={{ borderRadius: 1, color: "common.white" }}><ListItemIcon sx={{ color: "inherit", minWidth: 46 }}><HelpOutlineRounded /></ListItemIcon><ListItemText primary="Aide et support" /></ListItemButton>
            <ListItemButton component={NavLink} to="/connexion" sx={{ borderRadius: 1, color: "common.white" }}><ListItemIcon sx={{ color: "inherit", minWidth: 46 }}><LogoutRounded /></ListItemIcon><ListItemText primary="Déconnexion" /></ListItemButton>
          </List>
        </Box>
      </Box>
    </Drawer>
  );
}

export function App() {
  const location = useLocation();
  const pageTitle = useMemo(() => {
    if (location.pathname === "/") return "Vue d’ensemble";
    if (location.pathname === "/impact") return "Impact";
    if (location.pathname.startsWith("/groupes")) return "Groupes";
    if (location.pathname.startsWith("/offres/nouvelle")) return "Créer une offre";
    return "Offres";
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <AppBar color="inherit" elevation={0} position="static" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <Toolbar sx={{ minHeight: "98px !important", px: "36px !important" }}>
            <Typography component="h1" variant="h4" sx={{ flexGrow: 1 }}>{pageTitle}</Typography>
            <IconButton aria-label="Notifications" sx={{ mr: 2 }}><NotificationsNoneRounded /></IconButton>
            <Avatar sx={{ bgcolor: "primary.main", fontWeight: 700 }}>AZ</Avatar>
            <Typography sx={{ ml: 2, fontWeight: 500 }}>Bonjour, Agro-Intrants Zio</Typography>
            <KeyboardArrowDownRounded sx={{ ml: 1 }} />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ width: "min(100% - 72px, 1280px)", mx: "auto", py: 2.25 }}>
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
        </Box>
      </Box>
    </Box>
  );
}
