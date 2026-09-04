import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import { Box, Button, Card, Chip, Divider, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { DemoPanel } from "../components/DemoPanel";
import { ShareBox } from "../components/ShareBox";
import { getGroup, getProduct } from "../lib/api/endpoints";
import { POLL_INTERVAL_MS } from "../lib/config";
import { delai, entier, fcfa, libelleStatut, pourcentage, remise, unites } from "../lib/format";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

export function GroupDetailPage() {
  const { groupId = "" } = useParams();
  const id = Number(groupId);
  const group = useAsyncResource(() => getGroup(id), [id], { pollMs: POLL_INTERVAL_MS });
  const previousPrice = useRef<number | null>(null);
  const [tierUnlocked, setTierUnlocked] = useState(false);

  useEffect(() => {
    const price = group.data?.current_unit_price;
    if (price === undefined) return;
    if (previousPrice.current !== null && price < previousPrice.current) {
      setTierUnlocked(true);
      const timer = window.setTimeout(() => setTierUnlocked(false), 6000);
      previousPrice.current = price;
      return () => window.clearTimeout(timer);
    }
    previousPrice.current = price;
  }, [group.data?.current_unit_price]);

  if (group.isLoading) return <LoadingState title="Chargement du groupe…" />;
  if (group.error || !group.data) return <ErrorState title="Groupe indisponible" description={group.error?.message} retry={group.refresh} />;

  const current = group.data;
  const progress = pourcentage(current.progress_ratio);
  const nextTierMessage = current.quantity_to_next_tier === null || current.next_tier === null
    ? "Le meilleur prix disponible est déjà appliqué à ce groupe."
    : `Il manque ${unites(current.quantity_to_next_tier, current.product.unit_label)} pour atteindre le prochain prix.`;

  return <Stack spacing={3.5} sx={{ py: 1 }}>
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}><Button component={Link} startIcon={<ArrowBackRounded />} to="/offres" variant="text">Retour aux offres</Button><Chip label={libelleStatut(current.status)} size="small" variant="outlined" /></Stack>
    <Box><Typography color="text.secondary" variant="body2">Achat groupé en cours</Typography><Typography variant="h4">{current.name}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{current.product.name} · unité : {current.product.unit_label} · code : {current.share_code}</Typography></Box>
    {tierUnlocked && <Card sx={{ bgcolor: "success.light", color: "success.main" }} variant="outlined"><Box sx={{ p: 2 }}><Typography sx={{ fontWeight: 700 }}>Palier débloqué — le nouveau prix s’applique à toutes les commandes du groupe.</Typography></Box></Card>}
    <Card variant="outlined" sx={{ boxShadow: 1 }}><Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 3, alignItems: "center", p: 3, "@media (max-width: 620px)": { gridTemplateColumns: "1fr" } }}><Box sx={{ display: "grid", width: 88, height: 88, placeItems: "center", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default", color: "text.secondary" }}>{current.product.image_url ? <Box alt="" component="img" src={current.product.image_url} sx={{ width: "100%", height: "100%", borderRadius: 1, objectFit: "contain" }} /> : <Inventory2Outlined />}</Box><Box><Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}><AccessTimeRounded fontSize="small" /><Typography variant="body2">Clôture {delai(current.seconds_remaining)}</Typography></Stack><Typography sx={{ mt: 1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h3">{entier(current.current_quantity)} <Box color="text.secondary" component="span" sx={{ fontWeight: 400 }}>/ {entier(current.target_quantity)}</Box></Typography><Typography color="text.secondary" variant="body2">Volume commandé · {current.product.unit_label}</Typography><Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}><LinearProgress sx={{ flexGrow: 1, height: 12, borderRadius: 99, bgcolor: "divider", "& .MuiLinearProgress-bar": { borderRadius: 99, bgcolor: "secondary.main" } }} value={progress} variant="determinate" /><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="body2">{progress} %</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{nextTierMessage}</Typography></Box></Box></Card>
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, .65fr)", gap: 2.5, "@media (max-width: 820px)": { gridTemplateColumns: "1fr" } }}><Stack spacing={2.5}><Card variant="outlined"><Box sx={{ p: 3 }}><Typography variant="h5">Prix et mobilisation</Typography><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 3, mt: 2.5, "@media (max-width: 520px)": { gridTemplateColumns: "1fr" } }}><Box><Typography color="text.secondary" variant="caption">Prix appliqué par unité</Typography><Typography color="success.main" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{fcfa(current.current_unit_price)}</Typography></Box><Box><Typography color="text.secondary" variant="caption">Prochain prix</Typography><Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} variant="h5">{current.next_tier ? fcfa(current.next_tier.unit_price) : "Palier maximal"}</Typography></Box></Box><Divider sx={{ my: 2.5 }} /><Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}><GroupsOutlined color="action" /><Box><Typography sx={{ fontWeight: 700 }}>{entier(current.participants_count)} participants</Typography><Typography color="text.secondary" variant="body2">Économie du groupe : {fcfa(current.group_total_saving)} · minimum : {unites(current.min_quantity, current.product.unit_label)}</Typography></Box></Stack></Box></Card><TierGrid currentMinQuantity={current.current_tier.min_quantity} productId={current.product.id} retailPrice={current.product.individual_price} unitLabel={current.product.unit_label} /></Stack><Stack spacing={2.5}><ShareBox groupId={current.id} />{current.status === "OPEN" && <DemoPanel groupId={current.id} onSimulated={group.refresh} unitLabel={current.product.unit_label} />}</Stack></Box>
  </Stack>;
}

function TierGrid({ currentMinQuantity, productId, retailPrice, unitLabel }: { currentMinQuantity: number; productId: number; retailPrice: number; unitLabel: string }) {
  const product = useAsyncResource(() => getProduct(productId), [productId]);
  if (!product.data || product.data.tiers.length === 0) return null;
  return <Card variant="outlined"><Box sx={{ p: 3 }}><Typography variant="h5">Grille de prix</Typography><TableContainer sx={{ mt: 1.5 }}><Table aria-label="Grille de prix" sx={{ minWidth: 560 }}><TableHead><TableRow><TableCell>Palier</TableCell><TableCell>À partir de</TableCell><TableCell align="right">Prix unitaire</TableCell><TableCell align="right">Remise</TableCell></TableRow></TableHead><TableBody>{product.data.tiers.map((tier, index) => { const active = tier.min_quantity === currentMinQuantity; const discount = remise(retailPrice, tier.unit_price); return <TableRow key={tier.min_quantity} selected={active}><TableCell><Typography sx={{ fontWeight: active ? 700 : 400 }}>Palier {index + 1}{active ? " · en vigueur" : ""}</Typography></TableCell><TableCell>{unites(tier.min_quantity, unitLabel)}</TableCell><TableCell align="right">{fcfa(tier.unit_price)}</TableCell><TableCell align="right">{discount > 0 ? `−${discount} %` : "Prix détail"}</TableCell></TableRow>; })}</TableBody></Table></TableContainer></Box></Card>;
}
