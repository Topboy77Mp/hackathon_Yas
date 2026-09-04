import { Link } from "react-router-dom";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { getMerchantDashboard } from "../lib/dashboardData";
import type { MerchantDashboardView } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

function progressOf(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function statusLabel(status: string): string {
  return status === "OPEN" ? "Actif" : status === "LOCKED" ? "Verrouillé" : status === "COMPLETED" ? "Terminé" : status;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card variant="outlined"><CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: "22px !important" }}>
    <Box sx={{ display: "grid", width: 40, height: 40, placeItems: "center", color: "success.main" }}>{icon}</Box>
    <Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography sx={{ fontWeight: 700 }} variant="h6">{value}</Typography></Box>
  </CardContent></Card>;
}

function OfferGroups({ dashboard }: { dashboard: MerchantDashboardView }) {
  if (dashboard.rows.length === 0) {
    return <Card variant="outlined"><CardContent sx={{ display: "grid", minHeight: 280, placeItems: "center", textAlign: "center", p: 4 }}>
      <Stack spacing={1.5} sx={{ alignItems: "center", maxWidth: 420 }}>
        <Box sx={{ display: "grid", width: 40, height: 40, placeItems: "center", color: "success.main" }}><Inventory2Outlined /></Box>
        <Typography variant="h5">Aucun groupe en cours</Typography>
        <Typography color="text.secondary">Créez une offre avec ses paliers pour lancer votre premier achat groupé.</Typography>
        <Button component={Link} startIcon={<AddRounded />} to="/offres/nouvelle" variant="contained">Créer une offre</Button>
      </Stack>
    </CardContent></Card>;
  }

  return <Card variant="outlined"><CardContent sx={{ p: "28px !important" }}>
    <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
      <Box><Typography variant="h5">Groupes associés à vos offres</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">Suivez la progression et le montant engagé pour chaque achat groupé.</Typography></Box>
      <Chip color="success" label={`${dashboard.rows.length} en cours`} size="small" />
    </Stack>
    <TableContainer><Table aria-label="Groupes associés à vos offres" sx={{ minWidth: 720 }}>
      <TableHead><TableRow>
        <TableCell>Produit et groupe</TableCell><TableCell sx={{ minWidth: 220 }}>Progression</TableCell><TableCell align="center">Participants</TableCell><TableCell align="right">Prix actuel</TableCell><TableCell align="right">Valeur engagée</TableCell><TableCell align="right">Action</TableCell>
      </TableRow></TableHead>
      <TableBody>{dashboard.rows.map((group) => {
        const progress = progressOf(group.currentQuantity, group.targetQuantity);
        return <TableRow hover key={group.groupId}>
          <TableCell><Stack spacing={0.25}><Typography sx={{ fontWeight: 700 }}>{group.productName}</Typography><Typography color="text.secondary" variant="body2">{group.groupName} · <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>{statusLabel(group.status)}</Box></Typography></Stack></TableCell>
          <TableCell><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><LinearProgress sx={{ flexGrow: 1, height: 9, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography sx={{ minWidth: 38, fontWeight: 700 }} variant="body2">{progress} %</Typography></Stack><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">{amount.format(group.currentQuantity)} / {amount.format(group.targetQuantity)} unités</Typography></TableCell>
          <TableCell align="center"><Typography sx={{ fontWeight: 700 }}>{amount.format(group.participants)}</Typography></TableCell>
          <TableCell align="right"><Typography sx={{ fontWeight: 700 }}>{amount.format(group.currentUnitPrice)} FCFA</Typography></TableCell>
          <TableCell align="right"><Typography sx={{ fontWeight: 700 }}>{amount.format(group.totalAmount)} FCFA</Typography></TableCell>
          <TableCell align="right"><Button component={Link} endIcon={<ArrowOutwardRounded />} to={`/groupes/${group.groupId}`} variant="text">Ouvrir</Button></TableCell>
        </TableRow>;
      })}</TableBody>
    </Table></TableContainer>
  </CardContent></Card>;
}

export function OffersPage() {
  const resource = useAsyncResource(getMerchantDashboard, []);
  if (resource.isLoading) return <LoadingState title="Chargement de vos offres…" />;
  if (resource.error || !resource.data) return <ErrorState title="Offres indisponibles" description={resource.error?.message} retry={resource.retry} />;

  const dashboard = resource.data;
  return <Stack spacing={3} sx={{ py: 0.25 }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}>
      <Box><Typography color="success.main" sx={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }} variant="overline">Espace commerçant</Typography><Typography variant="h4">Offres et groupes</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>{dashboard.businessName} · pilotez les achats groupés lancés depuis vos offres.</Typography></Box>
      <Button component={Link} startIcon={<AddRounded />} to="/offres/nouvelle" variant="contained" color="secondary">Créer une offre</Button>
    </Stack>

    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2, "@media (max-width: 1100px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, "@media (max-width: 600px)": { gridTemplateColumns: "1fr" } }}>
      <SummaryCard icon={<GroupsOutlined />} label="Groupes en cours" value={amount.format(dashboard.groups)} />
      <SummaryCard icon={<ShoppingCartOutlined />} label="Commandes reçues" value={amount.format(dashboard.orders)} />
      <SummaryCard icon={<Inventory2Outlined />} label="Unités réservées" value={amount.format(dashboard.units)} />
      <SummaryCard icon={<PaymentsOutlined />} label="Valeur engagée" value={`${amount.format(dashboard.revenue)} FCFA`} />
    </Box>

    <OfferGroups dashboard={dashboard} />
  </Stack>;
}
