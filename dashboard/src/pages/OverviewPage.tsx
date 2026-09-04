import { Link } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import { getImpactStats, getMerchantDashboard } from "../lib/dashboardData";
import { USE_MOCKS } from "../lib/config";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

export function OverviewPage() {
  const merchant = useAsyncResource(getMerchantDashboard, []);
  const impact = useAsyncResource(getImpactStats, []);

  if (merchant.isLoading) return <LoadingState title="Chargement de votre espace…" />;
  if (merchant.error || !merchant.data) return <ErrorState description={merchant.error?.message} retry={merchant.retry} title="Espace commerçant indisponible" />;

  const dashboard = merchant.data;
  const group = dashboard.rows[0];
  const kpis = [
    { icon: <GroupsOutlined />, label: "Groupes actifs", value: dashboard.groups },
    { icon: <ShoppingCartOutlined />, label: "Commandes", value: dashboard.units },
    { icon: <AssessmentOutlined />, label: "Chiffre d’affaires", value: `${amount.format(dashboard.revenue)} FCFA` },
    { icon: <AccountBalanceWalletOutlined />, label: "Économies communauté", value: impact.data ? `${amount.format(impact.data.totalSavings)} FCFA` : "…" },
  ];
  const offers = USE_MOCKS && group && dashboard.rows.length === 1
    ? [group, { ...group, groupId: "urea", productName: "Urée 46%", currentQuantity: 85, targetQuantity: 150, participants: 24 }, { ...group, groupId: "lambda", productName: "Pesticide Lambda 25EC", currentQuantity: 50, targetQuantity: 100, participants: 16 }]
    : dashboard.rows;

  return (
    <Stack spacing={2.5} sx={{ py: 0.25 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button component={Link} startIcon={<AddRounded />} to="/offres/nouvelle" variant="contained" color="secondary">Créer une offre</Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2, "@media (max-width: 1000px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, "@media (max-width: 600px)": { gridTemplateColumns: "1fr" } }}>
        {kpis.map((kpi) => <Card key={kpi.label} variant="outlined"><CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: "24px !important" }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "success.light", color: "success.main" }}>{kpi.icon}</Avatar>
          <Box sx={{ minWidth: 0 }}><Typography color="text.primary" variant="body2">{kpi.label}</Typography><Typography color="success.main" noWrap variant="h5">{kpi.value}</Typography></Box>
        </CardContent></Card>)}
      </Box>

      {group && <Card variant="outlined"><CardContent sx={{ p: "28px !important" }}>
        <Typography variant="h5">Groupe en progression</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "192px minmax(0, 1fr) auto", alignItems: "center", gap: 3.5, mt: 2.5, "@media (max-width: 760px)": { gridTemplateColumns: "1fr" } }}>
          <Box sx={{ display: "grid", minHeight: 190, placeItems: "center", borderRadius: 1, bgcolor: "background.default" }}><Box sx={{ display: "grid", width: 112, height: 150, alignContent: "center", justifyItems: "center", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}><Typography sx={{ fontWeight: 700 }} variant="h5">NPK</Typography><Typography sx={{ fontWeight: 700 }}>15-15-15</Typography><Typography sx={{ mt: 3 }} variant="caption">50 kg</Typography></Box></Box>
          <Box><Typography variant="h4">{group.productName}</Typography><Typography sx={{ mt: 1.5 }} variant="h5"><Box component="span" sx={{ color: "success.main" }}>{group.currentQuantity}</Box><Box component="span" color="text.secondary"> / {group.targetQuantity} sacs</Box></Typography><Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}><LinearProgress sx={{ flexGrow: 1, height: 12, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={(group.currentQuantity / group.targetQuantity) * 100} variant="determinate" /><Typography>{Math.round((group.currentQuantity / group.targetQuantity) * 100)} %</Typography></Box><Stack direction="row" divider={<Divider flexItem orientation="vertical" />} spacing={4} sx={{ mt: 3 }}><Box><Typography variant="body2">Palier actuel</Typography><Typography color="success.main" variant="h5">{amount.format(group.currentUnitPrice)} FCFA</Typography></Box><Box><Typography variant="body2">Prochain palier</Typography><Typography color="success.main" variant="h5">17 500 FCFA</Typography></Box></Stack></Box>
          <Button component={Link} endIcon={<ChevronRightRounded />} to={`/groupes/${group.groupId}`} variant="outlined">Voir le groupe</Button>
        </Box>
      </CardContent></Card>}

      <Card variant="outlined"><CardContent sx={{ p: "28px !important" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}><Typography variant="h5">Offres récentes</Typography><Button component={Link} endIcon={<ChevronRightRounded />} to="/offres">Voir toutes les offres</Button></Box>
        <TableContainer><Table aria-label="Offres récentes"><TableHead><TableRow><TableCell>Produit</TableCell><TableCell>Progression</TableCell><TableCell>Statut</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{offers.map((offer) => { const progress = Math.round((offer.currentQuantity / offer.targetQuantity) * 100); return <TableRow key={offer.groupId}><TableCell><Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Avatar sx={{ width: 44, height: 44, bgcolor: "background.default", color: "text.primary", fontWeight: 700 }}><Typography variant="caption">NPK</Typography></Avatar><Typography sx={{ fontWeight: 500 }}>{offer.productName}</Typography></Stack></TableCell><TableCell sx={{ minWidth: 240 }}><Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Typography variant="body2">{offer.currentQuantity} / {offer.targetQuantity} sacs</Typography><LinearProgress sx={{ flexGrow: 1, height: 10, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography variant="body2">{progress} %</Typography></Stack></TableCell><TableCell><Chip color="success" label="Actif" size="small" /></TableCell><TableCell align="right"><IconButton component={Link} to={`/groupes/${offer.groupId}`}><VisibilityOutlined /></IconButton><IconButton component={Link} to="/impact"><AssessmentOutlined /></IconButton><IconButton><MoreVertRounded /></IconButton></TableCell></TableRow>; })}</TableBody></Table></TableContainer>
      </CardContent></Card>
    </Stack>
  );
}
