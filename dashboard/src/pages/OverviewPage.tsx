import { Link } from "react-router-dom";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
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
import { getGroup, getImpact, getMerchantDashboard } from "../lib/api/endpoints";
import { delai, entier, fcfa, pourcentage, unites } from "../lib/format";
import { useAsyncResource } from "../lib/useAsyncResource";
import { KpiTooltip } from "../components/KpiTooltip";
import { ErrorState, LoadingState } from "./ResourceState";

export function OverviewPage() {
  const merchant = useAsyncResource(getMerchantDashboard, []);
  const impact = useAsyncResource(getImpact, []);
  const firstGroupId = merchant.data?.rows[0]?.group_id;
  const group = useAsyncResource(() => firstGroupId ? getGroup(firstGroupId) : Promise.resolve(null), [firstGroupId]);

  if (merchant.isLoading) return <LoadingState title="Chargement de votre espace…" />;
  if (merchant.error || !merchant.data) return <ErrorState title="Espace commerçant indisponible" description={merchant.error?.message} retry={merchant.refresh} />;

  const dashboard = merchant.data;
  const active = group.data;
  const metrics = [
    { icon: <GroupsOutlined fontSize="small" />, label: "Groupes ouverts", description: "Nombre de groupes d’achat actuellement ouverts sur vos offres.", value: entier(dashboard.groups), color: "text.primary" },
    { icon: <ShoppingCartOutlined fontSize="small" />, label: "Commandes reçues", description: "Nombre total de commandes enregistrées sur vos groupes d’achat.", value: entier(dashboard.orders), color: "text.primary" },
    { icon: <Inventory2Outlined fontSize="small" />, label: "Unités réservées", description: "Somme des quantités réservées par les acheteurs dans vos groupes.", value: entier(dashboard.units), color: "text.primary" },
    { icon: <AccountBalanceWalletOutlined fontSize="small" />, label: "Économies communauté", description: "Écart cumulé entre le prix de référence et les prix obtenus grâce aux achats groupés.", value: impact.data ? fcfa(impact.data.community_savings) : "…", color: "success.main" },
  ];

  return <Stack spacing={3.5} sx={{ py: 1 }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
      <Box><Typography color="text.secondary" variant="body2">Activité commerciale</Typography><Typography variant="h4">Bon retour, {dashboard.business_name}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">Vos achats groupés, leurs volumes et les prochaines actions utiles.</Typography></Box>
      <Button color="secondary" component={Link} startIcon={<AddRounded />} to="/offres/nouvelle" variant="contained">Créer une offre</Button>
    </Stack>

    <Card variant="outlined"><Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", "@media (max-width: 960px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, "@media (max-width: 600px)": { gridTemplateColumns: "1fr" } }}>{metrics.map((metric, index) => <Box key={metric.label} sx={{ display: "flex", gap: 1.25, minWidth: 0, p: 2.5, borderRight: { md: index < metrics.length - 1 ? 1 : 0 }, borderBottom: { xs: index < metrics.length - 1 ? 1 : 0, md: 0 }, borderColor: "divider" }}><Box sx={{ color: "text.secondary", pt: 0.25 }}>{metric.icon}</Box><Box sx={{ minWidth: 0 }}><Stack direction="row" sx={{ alignItems: "center" }}><Typography color="text.secondary" variant="caption">{metric.label}</Typography><KpiTooltip label={metric.label} description={metric.description} /></Stack><Typography color={metric.color} noWrap sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{metric.value}</Typography></Box></Box>)}</Box></Card>

    {active && <Card variant="outlined" sx={{ boxShadow: 1 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, p: 3, borderBottom: 1, borderColor: "divider", "@media (max-width: 700px)": { gridTemplateColumns: "1fr" } }}><Box><Typography color="text.secondary" variant="body2">Groupe à suivre aujourd’hui</Typography><Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.75 }}><Typography variant="h5">{active.product.name}</Typography><Chip label="Ouvert" size="small" variant="outlined" /></Stack><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">{active.name} · {entier(active.participants_count)} participants</Typography></Box><Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}><AccessTimeRounded fontSize="small" /><Typography variant="body2">Clôture {delai(active.seconds_remaining)}</Typography></Stack></Box><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center", p: 3, "@media (max-width: 700px)": { gridTemplateColumns: "1fr" } }}><Box><Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline", flexWrap: "wrap" }}><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h4">{entier(active.current_quantity)} / {entier(active.target_quantity)}</Typography><Typography color="text.secondary">unité : {active.product.unit_label}</Typography></Stack><Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5 }}><LinearProgress sx={{ flexGrow: 1, height: 10, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={pourcentage(active.progress_ratio)} variant="determinate" /><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="body2">{pourcentage(active.progress_ratio)} %</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{active.quantity_to_next_tier !== null && active.next_tier ? `Il manque ${unites(active.quantity_to_next_tier, active.product.unit_label)} pour atteindre ${fcfa(active.next_tier.unit_price)}.` : "Le meilleur prix disponible est déjà appliqué à ce groupe."}</Typography><Stack direction={{ xs: "column", sm: "row" }} divider={<Divider flexItem orientation="vertical" />} spacing={3} sx={{ mt: 2.5 }}><Box><Typography color="text.secondary" variant="caption">Prix actuel par unité</Typography><Typography color="success.main" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{fcfa(active.current_unit_price)}</Typography></Box>{active.next_tier && <Box><Typography color="text.secondary" variant="caption">Prochain prix</Typography><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{fcfa(active.next_tier.unit_price)}</Typography></Box>}</Stack></Box><Button component={Link} endIcon={<ArrowOutwardRounded />} to={`/groupes/${active.id}`} variant="outlined">Voir le groupe</Button></Box></Card>}

    <Card variant="outlined"><Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between", p: 3, pb: 1.5 }}><Box><Typography variant="h5">Groupes en cours</Typography><Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">Les volumes qui demandent votre attention.</Typography></Box><Button component={Link} endIcon={<ArrowOutwardRounded />} to="/offres" variant="text">Toutes les offres</Button></Box><TableContainer><Table aria-label="Groupes en cours" sx={{ minWidth: 680 }}><TableHead><TableRow><TableCell>Produit</TableCell><TableCell sx={{ minWidth: 230 }}>Volume</TableCell><TableCell>État</TableCell><TableCell align="right">Accès</TableCell></TableRow></TableHead><TableBody>{dashboard.rows.map((row) => { const progress = Math.round((row.current_quantity / row.target_quantity) * 100); return <TableRow hover key={row.group_id}><TableCell><Typography sx={{ fontWeight: 700 }}>{row.product_name}</Typography><Typography color="text.secondary" variant="caption">{row.group_name}</Typography></TableCell><TableCell><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><LinearProgress sx={{ flexGrow: 1, height: 8, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography sx={{ fontVariantNumeric: "tabular-nums", minWidth: 34 }} variant="body2">{progress} %</Typography></Stack><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">{entier(row.current_quantity)} / {entier(row.target_quantity)} unités</Typography></TableCell><TableCell><Chip label={row.status === "OPEN" ? "Ouvert" : row.status} size="small" variant="outlined" /></TableCell><TableCell align="right"><Button component={Link} to={`/groupes/${row.group_id}`} variant="text">Ouvrir</Button></TableCell></TableRow>; })}</TableBody></Table></TableContainer></Card>
  </Stack>;
}
