/**
 * KashFlow — Types du contrat d'API.
 *
 * Aligné champ par champ sur `backend/openapi.json`, qui fait foi. La version
 * précédente avait été écrite avant la publication de l'OpenAPI et en divergeait
 * sur sept points — identifiants `string` au lieu d'entiers, `ImpactStats` aux
 * anciens noms de champs, `SuggestTiers` et `ShareMessage` obsolètes,
 * `MerchantDashboard` d'une autre forme, `deadline` au lieu de `deadline_hours`.
 * Ces écarts ne cassaient rien tant que l'application tournait sur des fixtures ;
 * ils cassaient tout au branchement.
 *
 * Règle : ce fichier ne décrit que ce que l'API renvoie réellement. Toute
 * modification suit la procédure de `docs/handoff/contract-changes.md`.
 * Aucune dépendance React Native ni DOM.
 */

// ---------------------------------------------------------------------------
// Énumérations (D4 — machines à états minimales)
// ---------------------------------------------------------------------------

export type UserRole = 'USER' | 'MERCHANT' | 'ADMIN';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type GroupStatus = 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

/** Types de notification réellement émis par le backend à ce jour. */
export type NotificationType = 'TIER_UNLOCKED' | 'GROUP_CANCELLED';

/** Provenance d'une réponse IA. Jamais affichée telle quelle à l'utilisateur. */
export type AiSource = 'ia' | 'repli';

// ---------------------------------------------------------------------------
// Erreurs — forme uniforme, le front ne devine pas
// ---------------------------------------------------------------------------

export interface ApiError {
  detail: string;
  code: string;
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  email?: string | null;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Paliers
// ---------------------------------------------------------------------------

/** Forme gelée par le contrat : `current_tier` et `next_tier` de GroupDetail. */
export interface Tier {
  min_quantity: number;
  unit_price: number;
}

/** Palier de la fiche produit : porte en plus sa borne haute, pour afficher « 1–49 ». */
export interface ProductTier extends Tier {
  max_quantity: number | null;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export interface ProductCard {
  id: number;
  name: string;
  unit_label: string;
  image_url: string | null;
  individual_price: number;
  /** Meilleur prix atteignable si le dernier palier est débloqué. Une promesse. */
  best_price: number;
  merchant_name: string;
  open_groups_count: number;
  /**
   * Prix en vigueur dans le groupe ouvert le moins cher, `null` s'il n'y en a
   * aucun. Un fait, contrairement à `best_price` : ne jamais annoncer une remise
   * que personne n'a encore débloquée.
   */
  best_open_group_price: number | null;
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
  tiers: ProductTier[];
  open_groups: GroupCard[];
}

// ---------------------------------------------------------------------------
// Groupes
// ---------------------------------------------------------------------------

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

export interface GroupDetailProduct {
  id: number;
  name: string;
  unit_label: string;
  image_url: string | null;
  individual_price: number;
  merchant_name: string;
}

export interface GroupMembership {
  joined: boolean;
  order_id: number;
  quantity: number;
  total_amount: number;
}

/**
 * Payload critique du contrat. Auto-suffisant : l'écran groupe se dessine
 * intégralement à partir de lui, sans second appel et sans calcul local (D3, D6).
 * Ses champs sont gelés — ne rien y ajouter sans dégel explicite. `tiers[]` est
 * le seul ajout autorisé à ce jour (cf. docs/handoff/contract-changes.md).
 */
export interface GroupDetail {
  id: number;
  name: string;
  share_code: string;
  status: GroupStatus;
  /** ISO 8601, en UTC. */
  deadline: string;
  seconds_remaining: number;
  product: GroupDetailProduct;
  participants_count: number;
  current_quantity: number;
  target_quantity: number;
  min_quantity: number;
  current_unit_price: number;
  current_tier: Tier;
  next_tier: Tier | null;
  quantity_to_next_tier: number | null;
  /** 0..1 */
  progress_ratio: number;
  /**
   * Grille complète du produit, ajoutée après arbitrage humain. Le contrat
   * figeait 20 champs sans `tiers[]` tout en exigeant que le payload soit
   * auto-suffisant : l'écran groupe n'affichait alors que 2 paliers sur 4.
   * `current_tier` et `next_tier` gardent leur forme gelée à deux champs.
   */
  tiers: ProductTier[];
  unit_saving: number;
  potential_unit_saving: number;
  group_total_saving: number;
  my_membership: GroupMembership | null;
}

export interface CreateGroupRequest {
  product_id: number;
  name: string;
  target_quantity: number;
  min_quantity: number;
  /** L'API prend une durée, pas une date : elle calcule l'échéance côté serveur. */
  deadline_hours?: number;
  /** Quantité de l'organisateur : l'order est créée au join, y compris pour lui (D2). */
  quantity?: number;
}

export interface JoinGroupRequest {
  quantity: number;
}

export interface JoinGroupResponse {
  order: Order;
  group: GroupDetail;
  /** Vrai si cette commande a fait basculer tout le groupe au palier suivant. */
  tier_unlocked: boolean;
  previous_unit_price: number;
}

export interface LeaveGroupResponse {
  group: GroupDetail;
}

// ---------------------------------------------------------------------------
// Commandes et paiement (mocké, cf. <perimetre>)
// ---------------------------------------------------------------------------

export interface Order {
  id: number;
  group_id: number;
  group_name: string;
  product_id: number;
  product_name: string;
  unit_label: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  individual_price: number;
  /** Économie réalisée sur cette commande, calculée par le serveur. */
  saving: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method: string;
  status: PaymentStatus;
  transaction_reference: string | null;
}

export interface PayOrderResponse {
  payment: Payment;
  order: Order;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: number;
  type: NotificationType | string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  unread_count: number;
  notifications: Notification[];
}

// ---------------------------------------------------------------------------
// Espace commerçant
// ---------------------------------------------------------------------------

export interface TierInput {
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  unit_label: string;
  image_url?: string | null;
  stock: number;
  individual_price: number;
  tiers?: TierInput[] | null;
}

export interface CreateTiersRequest {
  tiers: TierInput[];
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

export interface MerchantProductsResponse {
  products: MerchantProductRow[];
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

// ---------------------------------------------------------------------------
// KPI d'impact — endpoint public, c'est la page que le jury regarde
// ---------------------------------------------------------------------------

export interface ImpactStats {
  users: number;
  merchants: number;
  products: number;
  groups_created: number;
  groups_active: number;
  groups_successful: number;
  /** 0..1 */
  success_rate: number;
  orders: number;
  units_ordered: number;
  total_order_value: number;
  /** Le KPI phare du pitch. */
  community_savings: number;
}

// ---------------------------------------------------------------------------
// IA-1 — assistant de paliers commerçant
// ---------------------------------------------------------------------------

export interface SuggestTiersRequest {
  product_name: string;
  retail_price: number;
  stock: number;
  floor_price?: number | null;
}

export interface SuggestedTier extends TierInput {
  justification: string;
}

export interface SuggestTiersResponse {
  tiers: SuggestedTier[];
  source: AiSource;
}

// ---------------------------------------------------------------------------
// IA-2 — messages de partage
// ---------------------------------------------------------------------------

/** IA-2 a été réduite au français sur décision de l'orchestrateur. */
export interface ShareMessageRequest {
  group_id: number;
}

export interface ShareMessageVariant {
  /** Registre du message : « famille », « cooperative », « association »… */
  registre: string;
  texte: string;
}

export interface ShareMessageResponse {
  share_url: string;
  variants: ShareMessageVariant[];
  source: AiSource;
}

// ---------------------------------------------------------------------------
// IA-3 — découverte de groupes existants
// ---------------------------------------------------------------------------

export interface DiscoverGroupsRequest {
  query: string;
  product_id?: number | null;
}

export interface GroupSuggestion {
  /** 0..1 — en dessous de 0,6 le backend n'envoie rien. */
  score: number;
  reason: string;
  group: GroupCard;
}

export interface DiscoverGroupsResponse {
  query: string;
  suggestions: GroupSuggestion[];
  source: AiSource;
}
