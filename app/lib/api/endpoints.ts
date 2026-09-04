/**
 * KashFlow — Endpoints typés. Un appel = une fonction.
 *
 * Tout passe par l'API réelle : les fixtures ont été retirées avec le mode
 * maquette. Aucun calcul de prix ici ni ailleurs dans l'application — le front
 * affiche ce que l'API renvoie (D3).
 */
import type {
  AuthResponse,
  CreateGroupRequest,
  CreateProductRequest,
  CreateTiersRequest,
  DiscoverGroupsRequest,
  DiscoverGroupsResponse,
  GroupCard,
  GroupDetail,
  ImpactStats,
  JoinGroupRequest,
  JoinGroupResponse,
  LeaveGroupResponse,
  LoginRequest,
  MerchantDashboard,
  NotificationsResponse,
  Order,
  PayOrderResponse,
  ProductCard,
  ProductDetail,
  RegisterRequest,
  ShareMessageRequest,
  ShareMessageResponse,
  SuggestTiersRequest,
  SuggestTiersResponse,
  Tier,
  User,
} from '@shared/api/types';
import { apiRequest } from './client';

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export const register = (payload: RegisterRequest) =>
  apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: payload, auth: false });

export const login = (payload: LoginRequest) =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload, auth: false });

export const me = () => apiRequest<User>('/auth/me');

// ---------------------------------------------------------------------------
// Catalogue — public, aucun jeton requis
// ---------------------------------------------------------------------------

export const listProducts = () =>
  apiRequest<ProductCard[]>('/products', { auth: false });

export const getProduct = (id: number) =>
  apiRequest<ProductDetail>(`/products/${id}`, { auth: false });

// ---------------------------------------------------------------------------
// Groupes — cf. D6, endpoint de polling
// ---------------------------------------------------------------------------

export const listGroups = (productId?: number) =>
  apiRequest<GroupCard[]>(
    productId === undefined ? '/groups' : `/groups?product_id=${productId}`,
    { auth: false },
  );

export const createGroup = (payload: CreateGroupRequest) =>
  apiRequest<GroupDetail>('/groups', { method: 'POST', body: payload });

/**
 * Le jeton est envoyé quand il existe : c'est lui qui remplit `my_membership`.
 * L'endpoint reste lisible sans compte — un lien partagé doit s'ouvrir sans
 * inscription.
 */
export const getGroup = (id: number) => apiRequest<GroupDetail>(`/groups/${id}`);

export const getGroupByShareCode = (shareCode: string) =>
  apiRequest<GroupDetail>(`/groups/code/${encodeURIComponent(shareCode)}`);

export const joinGroup = (groupId: number, payload: JoinGroupRequest) =>
  apiRequest<JoinGroupResponse>(`/groups/${groupId}/join`, { method: 'POST', body: payload });

export const leaveGroup = (groupId: number) =>
  apiRequest<LeaveGroupResponse>(`/groups/${groupId}/leave`, { method: 'POST' });

// ---------------------------------------------------------------------------
// Commandes et paiement (mock côté backend, cf. <perimetre>)
// ---------------------------------------------------------------------------

export const listOrders = () => apiRequest<Order[]>('/orders');

export const getOrder = (orderId: number) => apiRequest<Order>(`/orders/${orderId}`);

export const payOrder = (orderId: number) =>
  apiRequest<PayOrderResponse>(`/orders/${orderId}/pay`, { method: 'POST' });

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const listNotifications = () => apiRequest<NotificationsResponse>('/notifications');

export const markNotificationRead = (id: number) =>
  apiRequest<unknown>(`/notifications/${id}/read`, { method: 'POST' });

// ---------------------------------------------------------------------------
// Espace commerçant — présent pour complétude du contrat ; l'espace pro vit
// dans /dashboard, l'app acheteur ne l'utilise pas.
// ---------------------------------------------------------------------------

export const createProduct = (payload: CreateProductRequest) =>
  apiRequest<ProductDetail>('/merchant/products', { method: 'POST', body: payload });

export const createTiers = (productId: number, payload: CreateTiersRequest) =>
  apiRequest<Tier[]>(`/merchant/products/${productId}/tiers`, { method: 'POST', body: payload });

export const getMerchantDashboard = () => apiRequest<MerchantDashboard>('/merchant/dashboard');

// ---------------------------------------------------------------------------
// KPI d'impact — public
// ---------------------------------------------------------------------------

export const getImpactStats = () =>
  apiRequest<ImpactStats>('/stats/impact', { auth: false });

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------

export const suggestTiers = (payload: SuggestTiersRequest) =>
  apiRequest<SuggestTiersResponse>('/ai/suggest-tiers', { method: 'POST', body: payload });

export const generateShareMessage = (payload: ShareMessageRequest) =>
  apiRequest<ShareMessageResponse>('/ai/share-message', { method: 'POST', body: payload });

export const discoverGroups = (payload: DiscoverGroupsRequest) =>
  apiRequest<DiscoverGroupsResponse>('/ai/discover-groups', { method: 'POST', body: payload });
