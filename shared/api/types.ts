/**
 * KashFlow — Types du contrat d'API
 * Un type par entité et par payload du bloc <contrat_partage> de docs/PROMPT-CONCEPTION.xml.
 * Propriétaire : AGENT_FRONT. Toute modification suit la procédure de gel du contrat
 * (docs/handoff/contract-changes.md). Aucune dépendance React Native ni DOM.
 *
 * Les payloads marqués "(non détaillé au contrat)" sont déduits raisonnablement du modèle de
 * données et des descriptions d'endpoints ; ils ne sont pas gelés au même titre que GroupDetail
 * et doivent être confirmés avec AGENT_BACK dès que l'OpenAPI existe.
 */

// ---------------------------------------------------------------------------
// Enums (D4 — machines à états minimales)
// ---------------------------------------------------------------------------

export type UserRole = 'USER' | 'MERCHANT' | 'ADMIN';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type GroupStatus = 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type NotificationType = 'TIER_UNLOCKED' | 'GROUP_COMPLETED' | 'GROUP_CANCELLED' | 'PAYMENT_CONFIRMED';

// ---------------------------------------------------------------------------
// Entités (modèle de données du contrat)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  created_at: string;
}

export interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  location: string;
  status: string;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  unit_label: string;
  image_url: string;
  stock: number;
  individual_price: number;
  status: ProductStatus;
  created_at: string;
}

export interface PriceTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface Group {
  id: string;
  creator_id: string;
  product_id: string;
  name: string;
  target_quantity: number;
  min_quantity: number;
  deadline: string;
  status: GroupStatus;
  share_code: string;
  created_at: string;
}

/** PAS de champ quantity : la quantité vit exclusivement dans Order (D2). */
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  group_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  transaction_reference: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Payloads d'authentification
// ---------------------------------------------------------------------------

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  email?: string;
  role?: UserRole;
  business_name?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Payload critique — GroupDetail
// Auto-suffisant : l'écran groupe se dessine intégralement à partir de lui (D3, D6).
// ---------------------------------------------------------------------------

export interface GroupDetailProduct {
  id: string;
  name: string;
  unit_label: string;
  image_url: string;
  individual_price: number;
  merchant_name: string;
}

export interface GroupDetailTier {
  min_quantity: number;
  unit_price: number;
}

export interface GroupDetailMembership {
  joined: boolean;
  order_id: string;
  quantity: number;
  total_amount: number;
}

export interface GroupDetail {
  id: string;
  name: string;
  share_code: string;
  status: GroupStatus;
  deadline: string;
  seconds_remaining: number;
  product: GroupDetailProduct;
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  min_quantity: number;
  current_unit_price: number;
  current_tier: GroupDetailTier;
  next_tier: GroupDetailTier | null;
  quantity_to_next_tier: number | null;
  progress_ratio: number;
  unit_saving: number;
  potential_unit_saving: number;
  group_total_saving: number;
  my_membership: GroupDetailMembership | null;
}

// ---------------------------------------------------------------------------
// Catalogue (non détaillé au contrat — déduit du modèle de données)
// ---------------------------------------------------------------------------

export interface ProductCard {
  id: string;
  name: string;
  description: string;
  unit_label: string;
  image_url: string;
  individual_price: number;
  merchant_name: string;
  status: ProductStatus;
  /**
   * Prix actuel du groupe ouvert le moins cher pour ce produit, s'il y en a un.
   * `undefined` quand aucun groupe n'est ouvert — le catalogue ne doit alors afficher
   * QUE individual_price, jamais une remise ou une progression inventée.
   */
  best_open_group_price?: number;
  open_groups_count?: number;
  /** Progression RÉELLE du groupe le moins cher (même groupe que best_open_group_price) —
   *  jamais affichée si undefined, jamais une valeur d'exemple comme "45/60". */
  best_open_group_current_quantity?: number;
  best_open_group_target_quantity?: number;
}

export interface GroupCard {
  id: string;
  name: string;
  share_code: string;
  status: GroupStatus;
  deadline: string;
  seconds_remaining: number;
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  current_unit_price: number;
  progress_ratio: number;
}

export interface ProductDetail extends Product {
  merchant_name: string;
  tiers: PriceTier[];
  open_groups: GroupCard[];
}

// ---------------------------------------------------------------------------
// Groupes — requêtes
// ---------------------------------------------------------------------------

export interface CreateGroupRequest {
  product_id: string;
  name: string;
  target_quantity: number;
  min_quantity: number;
  deadline: string;
  /** Quantité de l'organisateur, l'order est créée au join (D2), y compris pour le créateur. */
  quantity: number;
}

export interface JoinGroupRequest {
  quantity: number;
}

export interface JoinGroupResponse {
  order: Order;
  group: GroupDetail;
}

export interface LeaveGroupResponse {
  group: GroupDetail;
}

// ---------------------------------------------------------------------------
// Commandes et paiement (mock)
// ---------------------------------------------------------------------------

export interface PayOrderResponse {
  payment: Payment;
  order: Order;
}

// ---------------------------------------------------------------------------
// Espace commerçant
// ---------------------------------------------------------------------------

export interface CreateProductRequest {
  name: string;
  description: string;
  unit_label: string;
  image_url: string;
  stock: number;
  individual_price: number;
}

export interface CreateTiersRequest {
  tiers: Array<{ min_quantity: number; max_quantity: number | null; unit_price: number }>;
}

export interface MerchantDashboard {
  orders: Order[];
  groups: GroupCard[];
  revenue_simule: number;
  units: number;
}

// ---------------------------------------------------------------------------
// Dashboard jury — KPI d'impact
// ---------------------------------------------------------------------------

export interface ImpactStats {
  total_savings: number;
  active_groups_count: number;
  completed_groups_count: number;
  participants_count: number;
  units_ordered: number;
  total_value: number;
}

// ---------------------------------------------------------------------------
// IA-1 — Assistant de paliers commerçant
// ---------------------------------------------------------------------------

export interface SuggestTiersRequest {
  product_name: string;
  individual_price: number;
  stock: number;
  target_margin?: number;
  floor_price?: number;
}

export interface SuggestedTier {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  justification: string;
}

export interface SuggestTiersResponse {
  tiers: SuggestedTier[];
  source: 'ai' | 'fallback';
}

// ---------------------------------------------------------------------------
// IA-2 — Générateur de message de partage
// ---------------------------------------------------------------------------

export type ShareLanguage = 'fr' | 'ewe' | 'mina';
export type ShareRegister = 'familial' | 'professionnel' | 'associatif';

export interface ShareMessageRequest {
  product_name: string;
  current_unit_price: number;
  next_tier_unit_price: number | null;
  quantity_to_next_tier: number | null;
  seconds_remaining: number;
  language: ShareLanguage;
  register: ShareRegister;
  share_url: string;
}

export interface ShareMessageVariant {
  text: string;
}

export interface ShareMessageResponse {
  variants: ShareMessageVariant[];
  source: 'ai' | 'fallback';
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export interface ApiError {
  detail: string;
  code: string;
}
