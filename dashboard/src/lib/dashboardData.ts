import type { GroupDetail } from "@shared/api/types";
import { apiClient } from "./apiClient";
import { USE_MOCKS } from "./config";
import type { ImpactView } from "./dashboardTypes";
import { activeGroupFixture, merchantDashboardFixture, offerFixtures } from "./merchantFixtures";
import { impactFixtures } from "./impactFixtures";

export interface MerchantGroupView {
  id: string;
  name: string;
  productName: string;
  unitLabel: string;
  imageUrl: string;
  currentQuantity: number;
  targetQuantity: number;
  participants: number;
  currentPrice: number;
  nextPrice: number | null;
  quantityToNextTier: number | null;
  progressRatio: number;
  deadlineLabel: string;
}

export interface MerchantDashboardView {
  businessName: string;
  orders: number;
  groups: number;
  units: number;
  revenue: number;
  pendingOrders: number;
  rows: Array<{
    groupId: string;
    groupName: string;
    productName: string;
    participants: number;
    currentQuantity: number;
    targetQuantity: number;
    currentUnitPrice: number;
    totalAmount: number;
    status: string;
  }>;
}

export interface TierSuggestionView {
  minQuantity: number;
  unitPrice: number;
  justification: string;
  source: string;
}

export interface CreateMerchantProductInput {
  name: string;
  retailPrice: number;
  stock: number;
  tiers: Array<{ minQuantity: number; unitPrice: number }>;
}

function formatDeadline(secondsRemaining: number): string {
  const hours = Math.max(Math.ceil(secondsRemaining / 3600), 0);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return days > 0 ? `dans ${days} j ${remainingHours} h` : `dans ${remainingHours} h`;
}

function toGroupView(group: GroupDetail): MerchantGroupView {
  return {
    id: group.id,
    name: group.name,
    productName: group.product.name,
    unitLabel: group.product.unit_label,
    imageUrl: group.product.image_url,
    currentQuantity: group.current_quantity,
    targetQuantity: group.target_quantity,
    participants: group.participants_count,
    currentPrice: group.current_unit_price,
    nextPrice: group.next_tier?.unit_price ?? null,
    quantityToNextTier: group.quantity_to_next_tier,
    progressRatio: group.progress_ratio,
    deadlineLabel: formatDeadline(group.seconds_remaining),
  };
}

const groupFixture: MerchantGroupView = {
  ...activeGroupFixture,
  unitLabel: "sac",
  imageUrl: "",
  quantityToNextTier: 54,
  progressRatio: 0.73,
  deadlineLabel: activeGroupFixture.deadline,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  if (typeof value !== "number") throw new Error(`Réponse API invalide : champ ${key} absent.`);
  return value;
}

/**
 * Accepte le contrat legacy partagé et le contrat effectivement publié par back/phase-2.
 * La normalisation évite de propager les noms de champs du backend dans les composants visuels.
 */
function toImpactView(payload: unknown): ImpactView {
  if (!isRecord(payload)) throw new Error("Réponse API invalide pour les statistiques.");

  if ("community_savings" in payload) {
    return {
      totalSavings: numberValue(payload, "community_savings"),
      activeGroups: numberValue(payload, "groups_active"),
      activeGroupsLabel: "Groupes ouverts",
      successfulGroups: numberValue(payload, "groups_successful"),
      audience: numberValue(payload, "users"),
      audienceLabel: "Acheteurs inscrits",
      orderedUnits: numberValue(payload, "units_ordered"),
      totalValue: numberValue(payload, "total_order_value"),
    };
  }

  return {
    totalSavings: numberValue(payload, "total_savings"),
    activeGroups: numberValue(payload, "active_groups_count"),
    activeGroupsLabel: "Groupes actifs",
    successfulGroups: numberValue(payload, "completed_groups_count"),
    audience: numberValue(payload, "participants_count"),
    audienceLabel: "Participants",
    orderedUnits: numberValue(payload, "units_ordered"),
    totalValue: numberValue(payload, "total_value"),
  };
}

export async function getImpactStats(): Promise<ImpactView> {
  if (USE_MOCKS) return impactFixtures;
  return toImpactView(await apiClient<unknown>("/stats/impact"));
}

export async function getMerchantOffers() {
  // GET /merchant/dashboard n'est pas encore disponible : la page garde ses fixtures jusqu'à sa livraison.
  return offerFixtures;
}

function toMerchantDashboardView(payload: unknown): MerchantDashboardView {
  if (!isRecord(payload) || !Array.isArray(payload.rows)) {
    throw new Error("Réponse API invalide pour l’espace commerçant.");
  }

  return {
    businessName: String(payload.business_name ?? "Mon commerce"),
    orders: numberValue(payload, "orders"),
    groups: numberValue(payload, "groups"),
    units: numberValue(payload, "units"),
    revenue: numberValue(payload, "revenue_simule"),
    pendingOrders: numberValue(payload, "pending_orders"),
    rows: payload.rows.map((row) => {
      if (!isRecord(row)) throw new Error("Réponse API invalide pour un groupe commerçant.");
      return {
        groupId: String(row.group_id),
        groupName: String(row.group_name),
        productName: String(row.product_name),
        participants: numberValue(row, "participants_count"),
        currentQuantity: numberValue(row, "current_quantity"),
        targetQuantity: numberValue(row, "target_quantity"),
        currentUnitPrice: numberValue(row, "current_unit_price"),
        totalAmount: numberValue(row, "total_amount"),
        status: String(row.status),
      };
    }),
  };
}

export async function getMerchantDashboard(): Promise<MerchantDashboardView> {
  if (USE_MOCKS) return merchantDashboardFixture;
  return toMerchantDashboardView(await apiClient<unknown>("/merchant/dashboard"));
}

export async function suggestTiers(input: Pick<CreateMerchantProductInput, "name" | "retailPrice" | "stock">): Promise<TierSuggestionView[]> {
  if (USE_MOCKS) {
    return offerFixtures[0].tiers.map((tier) => ({
      minQuantity: tier.minQuantity,
      unitPrice: tier.unitPrice,
      justification: "Palier proposé pour encourager les commandes groupées.",
      source: "fallback",
    }));
  }

  const payload = await apiClient<unknown>("/ai/suggest-tiers", {
    method: "POST",
    body: JSON.stringify({ product_name: input.name, retail_price: input.retailPrice, stock: input.stock }),
  });
  if (!isRecord(payload) || !Array.isArray(payload.tiers)) throw new Error("Réponse IA invalide.");

  return payload.tiers.map((tier) => {
    if (!isRecord(tier)) throw new Error("Réponse IA invalide.");
    return {
      minQuantity: numberValue(tier, "min_quantity"),
      unitPrice: numberValue(tier, "unit_price"),
      justification: String(tier.justification ?? ""),
      source: String(payload.source ?? "fallback"),
    };
  });
}

export async function createMerchantProduct(input: CreateMerchantProductInput): Promise<void> {
  if (USE_MOCKS) return;

  await apiClient<unknown>("/merchant/products", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      unit_label: "sac",
      stock: input.stock,
      individual_price: input.retailPrice,
      tiers: input.tiers.map((tier, index, all) => ({
        min_quantity: tier.minQuantity,
        max_quantity: all[index + 1] ? all[index + 1].minQuantity - 1 : null,
        unit_price: tier.unitPrice,
      })),
    }),
  });
}

export async function getMerchantGroup(groupId: string): Promise<MerchantGroupView> {
  if (USE_MOCKS) return { ...groupFixture, id: groupId };
  const group = await apiClient<GroupDetail>(`/groups/${encodeURIComponent(groupId)}`);
  return toGroupView(group);
}
