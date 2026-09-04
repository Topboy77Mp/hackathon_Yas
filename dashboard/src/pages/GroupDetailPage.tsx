import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { getMerchantGroup } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

function ProductMark({ imageUrl, productName }: { imageUrl: string; productName: string }) {
  if (imageUrl) return <Box alt="" component="img" src={imageUrl} sx={{ width: 96, height: 96, borderRadius: 1, objectFit: "contain", bgcolor: "background.default" }} />;
  return <Box aria-label={productName} sx={{ display: "grid", width: 96, height: 96, placeItems: "center", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", color: "text.secondary" }}><Inventory2Outlined /></Box>;
}

export function GroupDetailPage() {
  const { groupId = "kov-2026" } = useParams();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resource = useAsyncResource(() => getMerchantGroup(groupId), [groupId]);
  if (resource.isLoading) return <LoadingState title="Chargement du groupe…" />;
  if (resource.error || !resource.data) return <ErrorState title="Groupe indisponible" description={resource.error?.message} retry={resource.retry} />;

  const group = resource.data;
  const progress = Math.min(100, Math.round(group.progressRatio * 100));
  const nextTierMessage = group.quantityToNextTier === null || group.nextPrice === null
    ? "Le meilleur prix disponible est déjà appliqué à ce groupe."
    : `Il manque ${amount.format(group.quantityToNextTier)} unités pour atteindre le prochain prix.`;

  async function copyGroupLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return <Stack spacing={3.5} sx={{ py: 1 }}>
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
      <Button component={Link} startIcon={<ArrowBackRounded />} to="/offres" variant="text">Retour aux offres</Button>
      <Chip label="Groupe ouvert" size="small" variant="outlined" />
    </Stack>

    <Box><Typography color="text.secondary" variant="body2">Achat groupé en cours</Typography><Typography variant="h4">{group.name}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{group.productName} · unité : {group.unitLabel}</Typography></Box>

    <Card variant="outlined" sx={{ boxShadow: 1 }}><Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 3, alignItems: "center", p: 3, "@media (max-width: 620px)": { gridTemplateColumns: "1fr" } }}>
      <ProductMark imageUrl={group.imageUrl} productName={group.productName} />
      <Box><Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}><AccessTimeRounded fontSize="small" /><Typography variant="body2">Clôture {group.deadlineLabel}</Typography></Stack><Typography sx={{ mt: 1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h3">{amount.format(group.currentQuantity)} <Box color="text.secondary" component="span" sx={{ fontWeight: 400 }}>/ {amount.format(group.targetQuantity)}</Box></Typography><Typography color="text.secondary" variant="body2">Volume commandé · {group.unitLabel}</Typography><Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}><LinearProgress sx={{ flexGrow: 1, height: 12, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="body2">{progress} %</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{nextTierMessage}</Typography></Box>
    </Box></Card>

    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, .65fr)", gap: 2.5, "@media (max-width: 820px)": { gridTemplateColumns: "1fr" } }}>
      <Card variant="outlined"><Box sx={{ p: 3 }}><Typography variant="h5">Prix et mobilisation</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 3, mt: 2.5, "@media (max-width: 520px)": { gridTemplateColumns: "1fr" } }}><Box><Typography color="text.secondary" variant="caption">Prix appliqué par unité</Typography><Typography color="success.main" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{amount.format(group.currentPrice)} FCFA</Typography></Box><Box><Typography color="text.secondary" variant="caption">Prochain prix</Typography><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{group.nextPrice === null ? "Palier maximal" : `${amount.format(group.nextPrice)} FCFA`}</Typography></Box></Box><Divider sx={{ my: 2.5 }} /><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><GroupsOutlined color="action" /><Box><Typography sx={{ fontWeight: 700 }}>{amount.format(group.participants)} participants</Typography><Typography color="text.secondary" variant="body2">Le volume, et non le nombre de personnes, fait progresser le prix.</Typography></Box></Stack></Box></Card>
      <Card variant="outlined"><Box sx={{ display: "flex", height: "100%", flexDirection: "column", p: 3 }}><Typography variant="h5">Partager le groupe</Typography><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">Un lien prêt à transmettre à vos producteurs pour accélérer l’atteinte du prochain palier.</Typography><Box sx={{ mt: "auto", pt: 3 }}><Button fullWidth onClick={copyGroupLink} startIcon={<ContentCopyRounded />} variant="contained">{copyState === "copied" ? "Lien copié" : "Copier le lien"}</Button>{copyState === "failed" && <Typography color="error" sx={{ display: "block", mt: 1 }} variant="caption">La copie est indisponible dans ce navigateur.</Typography>}</Box></Box></Card>
    </Box>
  </Stack>;
}
