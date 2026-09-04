import { Link } from "react-router-dom";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
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
import { getImpactStats, getMerchantDashboard, getMerchantGroup } from "../lib/dashboardData";
import { USE_MOCKS } from "../lib/config";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

function progressOf(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function ProductMark({ compact = false, imageUrl, label }: { compact?: boolean; imageUrl: string; label: string }) {
  const size = compact ? 40 : 72;
  if (imageUrl) return <Box alt="" component="img" src={imageUrl} sx={{ width: size, height: size, borderRadius: 1, objectFit: "contain", bgcolor: "background.default" }} />;
  return <Box aria-label={label} sx={{ display: "grid", width: size, height: size, placeItems: "center", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", color: "text.secondary" }}><Inventory2Outlined fontSize="small" /></Box>;
}

export function OverviewPage() {
  const merchant = useAsyncResource(getMerchantDashboard, []);
  const impact = useAsyncResource(getImpactStats, []);
  const firstGroupId = merchant.data?.rows[0]?.groupId;
  const groupDetails = useAsyncResource(() => firstGroupId ? getMerchantGroup(firstGroupId) : Promise.resolve(null), [firstGroupId]);

  if (merchant.isLoading) return <LoadingState title="Chargement de votre espace…" />;
  if (merchant.error || !merchant.data) return <ErrorState description={merchant.error?.message} retry={merchant.retry} title="Espace commerçant indisponible" />;

  const dashboard = merchant.data;
  const group = dashboard.rows[0];
  const details = groupDetails.data;
  const progress = group ? progressOf(group.currentQuantity, group.targetQuantity) : 0;
  const offers = USE_MOCKS && group && dashboard.rows.length === 1
    ? [group, { ...group, groupId: "urea", productName: "Urée 46%", currentQuantity: 85, targetQuantity: 150, participants: 24 }, { ...group, groupId: "lambda", productName: "Pesticide Lambda 25EC", currentQuantity: 50, targetQuantity: 100, participants: 16 }]
    : dashboard.rows;
  const metrics = [
    { icon: <GroupsOutlined fontSize="small" />, label: "Groupes ouverts", value: amount.format(dashboard.groups), color: "text.primary" },
    { icon: <ShoppingCartOutlined fontSize="small" />, label: "Commandes reçues", value: amount.format(dashboard.orders), color: "text.primary" },
    { icon: <Inventory2Outlined fontSize="small" />, label: "Unités réservées", value: amount.format(dashboard.units), color: "text.primary" },
    { icon: <AccountBalanceWalletOutlined fontSize="small" />, label: "Économies communauté", value: impact.data ? `${amount.format(impact.data.totalSavings)} FCFA` : "…", color: "success.main" },
  ];

  return <Stack spacing={3.5} sx={{ py: 1 }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
      <Box><Typography color="text.secondary" variant="body2">Activité commerciale</Typography><Typography variant="h4">Bon retour, {dashboard.businessName}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">Vos achats groupés, leurs volumes et les prochaines actions utiles.</Typography></Box>
      <Button color="secondary" component={Link} startIcon={<AddRounded />} to="/offres/nouvelle" variant="contained">Créer une offre</Button>
    </Stack>

    <Card variant="outlined"><Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", "@media (max-width: 960px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, "@media (max-width: 600px)": { gridTemplateColumns: "1fr" } }}>
      {metrics.map((metric, index) => <Box key={metric.label} sx={{ display: "flex", gap: 1.25, minWidth: 0, p: 2.5, borderRight: { md: index < metrics.length - 1 ? 1 : 0 }, borderBottom: { xs: index < metrics.length - 1 ? 1 : 0, md: 0 }, borderColor: "divider" }}>
        <Box sx={{ color: "text.secondary", pt: 0.25 }}>{metric.icon}</Box><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" variant="caption">{metric.label}</Typography><Typography color={metric.color} noWrap sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{metric.value}</Typography></Box>
      </Box>)}
    </Box></Card>

    {group && <Card variant="outlined" sx={{ borderColor: "divider", boxShadow: 1 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, p: 3, borderBottom: 1, borderColor: "divider", "@media (max-width: 700px)": { gridTemplateColumns: "1fr" } }}>
      <Box><Typography color="text.secondary" variant="body2">Groupe à suivre aujourd’hui</Typography><Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.75 }}><Typography variant="h5">{group.productName}</Typography><Chip label="Ouvert" size="small" variant="outlined" /></Stack><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">{group.groupName} · {amount.format(group.participants)} participants</Typography></Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}><AccessTimeRounded fontSize="small" /><Typography variant="body2">{details ? `Clôture ${details.deadlineLabel}` : "Échéance en cours de chargement"}</Typography></Stack>
    </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 3, alignItems: "center", p: 3, "@media (max-width: 780px)": { gridTemplateColumns: "1fr" } }}>
        <ProductMark imageUrl={details?.imageUrl ?? ""} label={group.productName} />
        <Box><Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline", flexWrap: "wrap" }}><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h4">{amount.format(group.currentQuantity)} / {amount.format(group.targetQuantity)}</Typography><Typography color="text.secondary">unité : {details?.unitLabel ?? "non précisée"}</Typography></Stack><Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5 }}><LinearProgress sx={{ flexGrow: 1, height: 10, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="body2">{progress} %</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{details?.quantityToNextTier && details.nextPrice ? `Il manque ${amount.format(details.quantityToNextTier)} unités pour atteindre ${amount.format(details.nextPrice)} FCFA.` : "Le prix affiché est celui actuellement appliqué à toutes les commandes du groupe."}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} divider={<Divider flexItem orientation="vertical" />} spacing={3} sx={{ mt: 2.5 }}><Box><Typography color="text.secondary" variant="caption">Prix actuel par unité</Typography><Typography color="success.main" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{amount.format(group.currentUnitPrice)} FCFA</Typography></Box>{details?.nextPrice && <Box><Typography color="text.secondary" variant="caption">Prochain prix</Typography><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h6">{amount.format(details.nextPrice)} FCFA</Typography></Box>}</Stack>
        </Box>
        <Button component={Link} endIcon={<ArrowOutwardRounded />} to={`/groupes/${group.groupId}`} variant="outlined">Voir le groupe</Button>
      </Box>
    </Card>}

    <Card variant="outlined"><Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between", p: 3, pb: 1.5 }}><Box><Typography variant="h5">Offres récentes</Typography><Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">Les groupes qui demandent votre attention.</Typography></Box><Button component={Link} endIcon={<ArrowOutwardRounded />} to="/offres" variant="text">Toutes les offres</Button></Box>
      <TableContainer><Table aria-label="Offres récentes" sx={{ minWidth: 680 }}><TableHead><TableRow><TableCell>Produit</TableCell><TableCell sx={{ minWidth: 230 }}>Volume</TableCell><TableCell>État</TableCell><TableCell align="right">Accès</TableCell></TableRow></TableHead><TableBody>{offers.map((offer) => { const offerProgress = progressOf(offer.currentQuantity, offer.targetQuantity); return <TableRow hover key={offer.groupId}><TableCell><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><ProductMark compact imageUrl="" label={offer.productName} /><Box><Typography sx={{ fontWeight: 700 }}>{offer.productName}</Typography><Typography color="text.secondary" variant="caption">{offer.groupName}</Typography></Box></Stack></TableCell><TableCell><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><LinearProgress sx={{ flexGrow: 1, height: 8, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={offerProgress} variant="determinate" /><Typography sx={{ fontVariantNumeric: "tabular-nums", minWidth: 34 }} variant="body2">{offerProgress} %</Typography></Stack><Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">{amount.format(offer.currentQuantity)} / {amount.format(offer.targetQuantity)} unités</Typography></TableCell><TableCell><Chip label={offer.status === "OPEN" ? "Ouvert" : offer.status} size="small" variant="outlined" /></TableCell><TableCell align="right"><Button component={Link} to={`/groupes/${offer.groupId}`} variant="text">Ouvrir</Button></TableCell></TableRow>; })}</TableBody></Table></TableContainer>
    </Card>
  </Stack>;
}
