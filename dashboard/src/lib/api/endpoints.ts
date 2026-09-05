/** Appels vers les endpoints utilisés par le dashboard. */

import { api } from "./client";
import type {
  AuthOut,
  GroupDetail,
  ImpactStats,
  MerchantDashboard,
  MerchantProductRow,
  NotificationsOut,
  ProductDetail,
  ShareMessageOut,
  SuggestTiersOut,
  Tier,
  TierIn,
} from "./types";

// Authentification

export function login(phone: string, password: string): Promise<AuthOut> {
  return api<AuthOut>("/auth/login", {
    method: "POST",
    body: { phone, password },
    signOutOn401: false,
  });
}

// Espace commerçant

export function getMerchantDashboard(): Promise<MerchantDashboard> {
  return api<MerchantDashboard>("/merchant/dashboard");
}

export async function getMerchantProducts(): Promise<MerchantProductRow[]> {
  const payload = await api<{ products: MerchantProductRow[] }>("/merchant/products");
  return payload.products;
}

export interface CreateProductInput {
  name: string;
  image_url?: string | null;
  description?: string | null;
  unit_label: string;
  stock: number;
  individual_price: number;
  tiers: TierIn[];
}

export function createProduct(input: CreateProductInput): Promise<ProductDetail> {
  return api<ProductDetail>("/merchant/products", { method: "POST", body: input });
}

export function replaceTiers(productId: number, tiers: TierIn[]): Promise<Tier[]> {
  return api<Tier[]>(`/merchant/products/${productId}/tiers`, {
    method: "POST",
    body: { tiers },
  });
}

// Groupes et catalogue

export function getGroup(groupId: number): Promise<GroupDetail> {
  return api<GroupDetail>(`/groups/${groupId}`);
}

export function getProduct(productId: number): Promise<ProductDetail> {
  return api<ProductDetail>(`/products/${productId}`);
}

// Statistiques

export function getImpact(): Promise<ImpactStats> {
  return api<ImpactStats>("/stats/impact");
}

// Notifications

export function getNotifications(): Promise<NotificationsOut> {
  return api<NotificationsOut>("/notifications");
}

export function markNotificationRead(id: number): Promise<unknown> {
  return api(`/notifications/${id}/read`, { method: "POST" });
}

// Assistants métier

export interface SuggestTiersInput {
  product_name: string;
  retail_price: number;
  stock: number;
  floor_price?: number | null;
}

export function suggestTiers(input: SuggestTiersInput): Promise<SuggestTiersOut> {
  return api<SuggestTiersOut>("/ai/suggest-tiers", { method: "POST", body: input });
}

export function shareMessage(groupId: number): Promise<ShareMessageOut> {
  return api<ShareMessageOut>("/ai/share-message", {
    method: "POST",
    body: { group_id: groupId },
  });
}
