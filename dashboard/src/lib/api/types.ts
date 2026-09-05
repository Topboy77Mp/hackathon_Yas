/**
 * Types de l'API, alignés sur `backend/openapi.json`.
 *
 * Pourquoi ce fichier et pas `@shared/api/types` : le fichier partagé a été écrit
 * avant la publication de l'OpenAPI et en diverge sur des points qui cassent le
 * dashboard — identifiants `string` alors que l'API renvoie des entiers,
 * `ImpactStats` aux anciens noms de champs, `SuggestTiers` et `ShareMessage`
 * obsolètes. Il appartient à AGENT_FRONT ; sa correction est demandée dans
 * `docs/handoff/contract-changes.md`. En attendant, le dashboard type ce qu'il
 * reçoit réellement. Les tokens de `@shared/theme` restent la source unique.
 */

export type UserRole = "USER" | "MERCHANT" | "ADMIN";
export type ProductStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type GroupStatus = "OPEN" | "LOCKED" | "COMPLETED" | "CANCELLED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface UserOut {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  role: UserRole;
}

export interface AuthOut {
  token: string;
  user: UserOut;
}

export interface Tier {
  min_quantity: number;
  unit_price: number;
}

export interface GroupCard {
  id: number;
  name: string;
  share_code: string;
  status: GroupStatus;
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  current_unit_price: number;
  progress_ratio: number;
  seconds_remaining: number;
}

export interface GroupDetail {
  id: number;
  name: string;
  share_code: string;
  status: GroupStatus;
  deadline: string;
  seconds_remaining: number;
  product: {
    id: number;
    name: string;
    unit_label: string;
    image_url: string | null;
    individual_price: number;
    merchant_name: string;
  };
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  min_quantity: number;
  current_unit_price: number;
  current_tier: Tier;
  next_tier: Tier | null;
  quantity_to_next_tier: number | null;
  progress_ratio: number;
  unit_saving: number;
  potential_unit_saving: number;
  group_total_saving: number;
  my_membership: {
    joined: boolean;
    order_id: number;
    quantity: number;
    total_amount: number;
  } | null;
}

export interface ProductDetail {
  id: number;
  name: string;
  description: string | null;
  unit_label: string;
  image_url: string | null;
  stock: number;
  individual_price: number;
  merchant_name: string;
  merchant_location: string | null;
  tiers: Tier[];
  open_groups: GroupCard[];
}

export interface MerchantProductRow {
  id: number;
  name: string;
  unit_label: string;
  image_url: string | null;
  stock: number;
  individual_price: number;
  best_price: number;
  status: ProductStatus;
  tiers: Tier[];
  groups_count: number;
  reserved_units: number;
}

export interface MerchantGroupRow {
  group_id: number;
  group_name: string;
  product_name: string;
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  current_unit_price: number;
  total_amount: number;
  status: GroupStatus;
}

export interface MerchantDashboard {
  business_name: string;
  orders: number;
  groups: number;
  units: number;
  revenue_simule: number;
  pending_orders: number;
  rows: MerchantGroupRow[];
}

export interface ImpactStats {
  users: number;
  merchants: number;
  products: number;
  groups_created: number;
  groups_active: number;
  groups_successful: number;
  success_rate: number;
  orders: number;
  units_ordered: number;
  total_order_value: number;
  community_savings: number;
}

export interface NotificationOut {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationsOut {
  unread_count: number;
  notifications: NotificationOut[];
}

/** Palier envoyé au backend : `max_quantity` null signifie « et au-delà ». */
export interface TierIn {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface TierSuggestion extends TierIn {
  justification: string;
}

export interface SuggestTiersOut {
  tiers: TierSuggestion[];
  /** "ia" ou "repli" — jamais affiché tel quel à l'utilisateur. */
  source: string;
}

export interface ShareVariant {
  registre: string;
  texte: string;
}

export interface ShareMessageOut {
  share_url: string;
  variants: ShareVariant[];
  source: string;
}
