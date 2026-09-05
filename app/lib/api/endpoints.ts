/**
 * KashFlow — Endpoints typés. Un appel = une fonction.
 *
 * Tout passe par l'API réelle : les fixtures ont été retirées avec le mode
 * maquette. Aucun calcul de prix ici ni ailleurs dans l'application — le front
 * affiche ce que l'API renvoie (D3).
 *
 * La surface commerçant (création de produit, grille de paliers, IA-1, tableau
 * de bord) n'est volontairement pas ici : elle appartient à /dashboard. La
 * dupliquer dans l'app acheteur laissait quatre fonctions que rien n'appelait.
 */
import type {
  AuthResponse,
  CatalogueQuery,
  ChangePasswordRequest,
  CreateGroupRequest,
  DiscoverGroupsRequest,
  DiscoverGroupsResponse,
  GroupCard,
  GroupDetail,
  ImpactStats,
  JoinGroupRequest,
  JoinGroupResponse,
  LeaveGroupResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  NotificationsResponse,
  Preferences,
  PreferencesInput,
  Order,
  PayOrderResponse,
  ProductCard,
  ProductDetail,
  RegisterRequest,
  ResetPasswordRequest,
  ShareMessageRequest,
  ShareMessageResponse,
  User,
} from '@shared/api/types';
import { apiRequest } from './client';
import { DEMO_TOKEN } from '../config';

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export const register = (payload: RegisterRequest) =>
  apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: payload, auth: false });

export const login = (payload: LoginRequest) =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload, auth: false });

export const me = () => apiRequest<User>('/auth/me');

/**
 * Le serveur répond `sent: true` que le numéro existe ou non : distinguer les
 * deux cas ferait de cet endpoint un annuaire des inscrits. L'interface ne doit
 * donc jamais annoncer « ce numéro est inconnu ».
 */
export const forgotPassword = (payload: ForgotPasswordRequest) =>
  apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
    auth: false,
    // Sans jeton, le serveur ne renvoie pas le code : le flux reste entier mais
    // sa remise manque, faute de passerelle SMS au périmètre.
    headers: DEMO_TOKEN ? { 'X-Demo-Token': DEMO_TOKEN } : undefined,
  });

/** Vrai quand l'écran peut afficher le code, faute d'envoi réel. */
export const demoCodeDisponible = DEMO_TOKEN.length > 0;

export const resetPassword = (payload: ResetPasswordRequest) =>
  apiRequest<AuthResponse>('/auth/reset-password', {
    method: 'POST',
    body: payload,
    auth: false,
  });

export const changePassword = (payload: ChangePasswordRequest) =>
  apiRequest<User>('/auth/change-password', { method: 'POST', body: payload });

// ---------------------------------------------------------------------------
// Préférences
// ---------------------------------------------------------------------------

export const getPreferences = () => apiRequest<Preferences>('/me/preferences');

export const updatePreferences = (payload: PreferencesInput) =>
  apiRequest<Preferences>('/me/preferences', { method: 'PATCH', body: payload });

// ---------------------------------------------------------------------------
// Catalogue — public, aucun jeton requis
// ---------------------------------------------------------------------------

export const listProducts = (options: CatalogueQuery = {}) => {
  // Recherche et tri sont faits par le serveur : le prix affiché dépend du
  // groupe ouvert le moins cher, que le client n'a pas les moyens de classer.
  const params = new URLSearchParams();
  if (options.q?.trim()) params.set('q', options.q.trim());
  if (options.sort) params.set('sort', options.sort);
  if (options.with_open_groups) params.set('with_open_groups', 'true');

  const suffixe = params.toString();
  return apiRequest<ProductCard[]>(`/products${suffixe ? `?${suffixe}` : ''}`, {
    auth: false,
  });
};

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
// KPI d'impact — public
// ---------------------------------------------------------------------------

export const getImpactStats = () =>
  apiRequest<ImpactStats>('/stats/impact', { auth: false });

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------

export const generateShareMessage = (payload: ShareMessageRequest) =>
  apiRequest<ShareMessageResponse>('/ai/share-message', { method: 'POST', body: payload });

export const discoverGroups = (payload: DiscoverGroupsRequest) =>
  apiRequest<DiscoverGroupsResponse>('/ai/discover-groups', { method: 'POST', body: payload });
