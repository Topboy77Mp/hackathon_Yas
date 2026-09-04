import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import {
  Box,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { getImpactStats } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const integer = new Intl.NumberFormat("fr-FR");

export function ImpactPage() {
  const resource = useAsyncResource(getImpactStats, []);
  if (resource.isLoading) return <LoadingState title="Chargement des indicateurs d’impact…" />;
  if (resource.error || !resource.data) return <ErrorState title="Statistiques indisponibles" description={resource.error?.message} retry={resource.retry} />;

  const impact = resource.data;
  const metrics = [
    { icon: <GroupsOutlined fontSize="small" />, label: impact.activeGroupsLabel, value: impact.activeGroups },
    { icon: <TrendingUpOutlined fontSize="small" />, label: "Groupes finalisés", value: impact.successfulGroups },
    { icon: <PeopleAltOutlined fontSize="small" />, label: impact.audienceLabel, value: impact.audience },
    { icon: <Inventory2Outlined fontSize="small" />, label: "Unités commandées", value: impact.orderedUnits },
  ];

  return <Stack spacing={3.5} sx={{ py: 1 }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}>
      <Box><Typography color="text.secondary" variant="body2">Impact de la communauté</Typography><Typography variant="h4">Le pouvoir d’achat, en commun.</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">Une lecture directe de ce que les achats groupés ont permis de préserver.</Typography></Box>
      <Chip label="Indicateurs cumulés" size="small" variant="outlined" />
    </Stack>

    <Card variant="outlined" sx={{ boxShadow: 1 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, .55fr)", gap: 3, p: 3.5, "@media (max-width: 720px)": { gridTemplateColumns: "1fr" } }}>
      <Box><Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "success.main" }}><AccountBalanceWalletOutlined fontSize="small" /><Typography sx={{ fontWeight: 700 }} variant="body2">Économies générées</Typography></Stack><Typography color="success.main" sx={{ mt: 1, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em" }} variant="h3">{integer.format(impact.totalSavings)} FCFA</Typography><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">Montant total économisé grâce aux prix obtenus par la communauté.</Typography></Box>
      <Box sx={{ alignSelf: "center", borderLeft: { sm: 1 }, borderTop: { xs: 1, sm: 0 }, borderColor: "divider", pl: { sm: 3 }, pt: { xs: 2.5, sm: 0 } }}><Typography color="text.secondary" variant="caption">Valeur totale des commandes</Typography><Typography sx={{ mt: 0.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{integer.format(impact.totalValue)} FCFA</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }} variant="body2">Volume engagé sur des commandes non annulées.</Typography></Box>
    </Box></Card>

    <Card variant="outlined"><Box sx={{ p: 3, pb: 1.5 }}><Typography variant="h5">L’activité en chiffres</Typography><Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">Des indicateurs concrets pour suivre la dynamique des groupements.</Typography></Box><Divider /><Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", "@media (max-width: 900px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, "@media (max-width: 540px)": { gridTemplateColumns: "1fr" } }}>{metrics.map((metric, index) => <Box key={metric.label} sx={{ display: "flex", gap: 1.25, minWidth: 0, p: 2.5, borderRight: { md: index < metrics.length - 1 ? 1 : 0 }, borderBottom: { xs: index < metrics.length - 1 ? 1 : 0, md: 0 }, borderColor: "divider" }}><Box sx={{ color: "text.secondary", pt: 0.25 }}>{metric.icon}</Box><Box><Typography color="text.secondary" variant="caption">{metric.label}</Typography><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{integer.format(metric.value)}</Typography></Box></Box>)}</Box></Card>

    <Typography color="text.secondary" sx={{ px: 0.5 }} variant="caption">Les montants affichés sont exprimés en FCFA et reposent sur les commandes non annulées.</Typography>
  </Stack>;
}
