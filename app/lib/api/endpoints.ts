/**
 * KashFlow — Endpoints typés.
 * Un appel = une fonction. Les endpoints de lecture pour lesquels AGENT_FRONT dispose de
 * fixtures (GroupDetail, ProductDetail, KPI) basculent sur les mocks quand USE_MOCKS est actif,
 * pour ne jamais dépendre de l'avancement d'AGENT_BACK (cf. contrat_partage).
 */
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  User,
  ProductCard,
  ProductDetail,
  GroupDetail,
  GroupCard,
  CreateGroupRequest,
  JoinGroupRequest,
  JoinGroupResponse,
  LeaveGroupResponse,
  PayOrderResponse,
  Order,
  MerchantDashboard,
  CreateProductRequest,
  CreateTiersRequest,
  PriceTier,
  ImpactStats,
  SuggestTiersRequest,
  SuggestTiersResponse,
  ShareMessageRequest,
  ShareMessageResponse,
} from '@shared/api/types';
import { apiRequest } from './client';
import { USE_MOCKS } from '../config';
import {
  groupDetailFixture,
  productCardsFixture,
  productDetailFixture,
  impactStatsFixture,
  demoUserFixture,
  mockAuthToken,
  buildJoinFixture,
} from '../fixtures';

const mockDelay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/**
 * État mémoire du join mocké : sans lui, le prochain tick de polling (2s) écraserait
 * l'état "rejoint" avec le fixture de base, puisque getGroup n'aurait aucun moyen de
 * savoir qu'un join a eu lieu. Réinitialisé au rechargement de la page (mémoire, pas
 * de persistance) — c'est un doublure de serveur pour le développement hors-ligne, pas
 * un vrai état applicatif.
 */
let mockJoinedGroup: GroupDetail | null = null;

// ---------------------------------------------------------------------------
// Auth — mockée intégralement : USE_MOCKS doit permettre de tester tout le parcours
// connecté (inscription → navigation → rejoindre) sans backend.
// ---------------------------------------------------------------------------

export const register = (payload: RegisterRequest): Promise<AuthResponse> =>
  USE_MOCKS
    ? mockDelay({ token: mockAuthToken, user: { ...demoUserFixture, first_name: payload.first_name, last_name: payload.last_name, phone: payload.phone } })
    : apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: payload, auth: false });

export const login = (payload: LoginRequest): Promise<AuthResponse> =>
  USE_MOCKS
    ? mockDelay({ token: mockAuthToken, user: demoUserFixture })
    : apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload, auth: false });

export const me = (): Promise<User> =>
  USE_MOCKS ? mockDelay(demoUserFixture) : apiRequest<User>('/auth/me');

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const listProducts = (): Promise<ProductCard[]> =>
  USE_MOCKS ? mockDelay(productCardsFixture) : apiRequest<ProductCard[]>('/products', { auth: false });

export const getProduct = (id: string): Promise<ProductDetail> =>
  USE_MOCKS
    ? mockDelay({ ...productDetailFixture, id })
    : apiRequest<ProductDetail>(`/products/${id}`, { auth: false });

// ---------------------------------------------------------------------------
// Groupes — cf. D6, endpoint de polling
// ---------------------------------------------------------------------------

export const listGroups = (productId: string): Promise<GroupCard[]> =>
  apiRequest<GroupCard[]>(`/groups?product_id=${productId}`, { auth: false });

export const createGroup = (payload: CreateGroupRequest) =>
  apiRequest<GroupDetail>('/groups', { method: 'POST', body: payload });

export const getGroup = (id: string): Promise<GroupDetail> =>
  USE_MOCKS
    ? mockDelay({ ...(mockJoinedGroup ?? groupDetailFixture), id })
    : apiRequest<GroupDetail>(`/groups/${id}`, { auth: false });

export const getGroupByShareCode = (shareCode: string): Promise<GroupDetail> =>
  USE_MOCKS
    ? mockDelay({ ...(mockJoinedGroup ?? groupDetailFixture), share_code: shareCode })
    : apiRequest<GroupDetail>(`/groups/code/${shareCode}`, { auth: false });

export const joinGroup = (groupId: string, payload: JoinGroupRequest): Promise<JoinGroupResponse> => {
  if (USE_MOCKS) {
    const { order, group } = buildJoinFixture(payload.quantity);
    mockJoinedGroup = { ...group, id: groupId };
    return mockDelay({ order, group: mockJoinedGroup });
  }
  return apiRequest<JoinGroupResponse>(`/groups/${groupId}/join`, { method: 'POST', body: payload });
};

export const leaveGroup = (groupId: string): Promise<LeaveGroupResponse> => {
  if (USE_MOCKS) {
    mockJoinedGroup = null;
    return mockDelay({ group: { ...groupDetailFixture, id: groupId } });
  }
  return apiRequest<LeaveGroupResponse>(`/groups/${groupId}/leave`, { method: 'POST' });
};

// ---------------------------------------------------------------------------
// Commandes et paiement (mock côté backend, cf. <perimetre>)
// ---------------------------------------------------------------------------

export const payOrder = (orderId: string) =>
  apiRequest<PayOrderResponse>(`/orders/${orderId}/pay`, { method: 'POST' });

export const listOrders = () => apiRequest<Order[]>('/orders');

// ---------------------------------------------------------------------------
// Espace commerçant
// ---------------------------------------------------------------------------

export const createProduct = (payload: CreateProductRequest) =>
  apiRequest<ProductDetail>('/merchant/products', { method: 'POST', body: payload });

export const createTiers = (productId: string, payload: CreateTiersRequest) =>
  apiRequest<PriceTier[]>(`/merchant/products/${productId}/tiers`, { method: 'POST', body: payload });

export const getMerchantDashboard = () => apiRequest<MerchantDashboard>('/merchant/dashboard');

// ---------------------------------------------------------------------------
// Dashboard jury
// ---------------------------------------------------------------------------

export const getImpactStats = (): Promise<ImpactStats> =>
  USE_MOCKS ? mockDelay(impactStatsFixture) : apiRequest<ImpactStats>('/stats/impact', { auth: false });

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------

export const suggestTiers = (payload: SuggestTiersRequest) =>
  apiRequest<SuggestTiersResponse>('/ai/suggest-tiers', { method: 'POST', body: payload });

export const generateShareMessage = (payload: ShareMessageRequest) =>
  apiRequest<ShareMessageResponse>('/ai/share-message', { method: 'POST', body: payload });
