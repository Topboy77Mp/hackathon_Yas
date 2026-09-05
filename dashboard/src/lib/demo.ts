/** Adaptateur LOCAL EXPLICITE. Aucun appel réseau, aucun jeton API accepté ici.
 * Les agrégats ci-dessous simulent un serveur ; les composants ne calculent pas les prix.
 * À remplacer par des endpoints autorisés : voir dashboard/INTEGRATION.md.
 */
import type { AuthOut, TierIn } from './api/types';
import type { ManagedProduct, Snapshot } from './management';
import { getSession } from './session';
import { tierFromApi, validateTiers } from './tiers';

const KEY = 'kashflow.management.demo.v1';
export const isDemo = () => getSession()?.token.startsWith('local-demo:') === true;
export function demoLogin(phone: string, password: string): AuthOut {
  if (password !== 'demo' || !['admin', 'commercant'].includes(phone)) throw new Error('Compte de démonstration ou mot de passe incorrect.');
  const admin = phone === 'admin';
  return { token: `local-demo:${phone}`, user: { id: admin ? 100 : 101, first_name: admin ? 'Afi' : 'Kossi', last_name: admin ? 'Admin' : 'Mensah', phone, email: null, role: admin ? 'ADMIN' : 'MERCHANT' } };
}
function seed(): Snapshot {
  const date = new Date();
  const users = Array.from({length: 38}, (_, i) => ({ id: i + 1, first_name: ['Ama', 'Koffi', 'Akouvi', 'Yao'][i % 4], last_name: `Adjei ${i + 1}`, phone: `+228 90 00 ${String(i + 1).padStart(4, '0')}`, email: null, role: 'USER' as const, status: 'ACTIVE' }));
  const products: ManagedProduct[] = [{ id: 1, merchant_id: 1, name: 'Engrais NPK 15-15-15', description: 'Sac de 50 kg destiné aux cultures vivrières.', category: 'Agriculture', location: 'Tsévié', delivery_days: 3, duration_days: 7, unit_label: 'sac', image_url: null, individual_price: 22000, best_price: 17500, stock: 600, status: 'ACTIVE', tiers: [{min_quantity: 1, unit_price: 22000}, {min_quantity: 50, unit_price: 20500}, {min_quantity: 100, unit_price: 19000}, {min_quantity: 200, unit_price: 17500}], groups_count: 1, reserved_units: 146 }, { id: 2, merchant_id: 1, name: 'Semences de maïs améliorées', description: 'Sachet de semences sélectionnées.', category: 'Agriculture', location: 'Tsévié', delivery_days: 2, duration_days: 7, unit_label: 'sachet', image_url: null, individual_price: 5000, best_price: 5000, stock: 100, status: 'DRAFT', tiers: [], groups_count: 0, reserved_units: 0 }];
  return { missing: [], users, products, shops: [{ id: 1, user_id: 101, name: 'Agro-Intrants Zio', description: 'Intrants et semences pour les producteurs de la région Maritime.', location: 'Tsévié', status: 'APPROVED' }, {id: 2, user_id: 102, name: 'Coopérative des Plateaux', description: 'Coopérative agricole.', location: 'Kpalimé', status: 'PENDING'}],
    groups: [{id: 1, creator_id: 1, merchant_id: 1, name: 'Producteurs de Kovié', share_code: 'KOVIE', status: 'OPEN', deadline: new Date(date.getTime() + 172800000).toISOString(), seconds_remaining: 172800, product: {id: 1, name: products[0].name, unit_label: 'sac', image_url: null, individual_price: 22000, merchant_name: 'Agro-Intrants Zio'}, participants_count: 38, current_quantity: 146, target_quantity: 200, min_quantity: 100, current_unit_price: 19000, current_tier: {min_quantity: 100, unit_price: 19000}, next_tier: {min_quantity: 200, unit_price: 17500}, quantity_to_next_tier: 54, progress_ratio: .73, unit_saving: 3000, potential_unit_saving: 4500, group_total_saving: 438000, my_membership: null}],
    orders: users.map((u, i) => ({id: 1001 + i, user_id: u.id, group_id: 1, product_id: 1, merchant_id: 1, quantity: i < 32 ? 4 : 3, unit_price: 19000, total_amount: i < 32 ? 76000 : 57000, payment_status: 'PENDING', order_status: 'PENDING', delivery_status: 'NEW', created_at: new Date(date.getTime() - i * 600000).toISOString(), transaction_reference: `SIM-${1001 + i}`})) };
}
function read(): Snapshot {
  const value = localStorage.getItem(KEY);
  if (value) { try { return JSON.parse(value); } catch { /* reconstruire une démo corrompue */ } }
  const data = seed(); localStorage.setItem(KEY, JSON.stringify(data)); return data;
}
function scope(data: Snapshot): Snapshot {
  const session = getSession();
  const expected = session?.token === 'local-demo:admin' ? 'ADMIN' : session?.token === 'local-demo:commercant' ? 'MERCHANT' : null;
  if (!expected || session?.user.role !== expected || session.user.id !== (expected === 'ADMIN' ? 100 : 101)) throw new Error('Session de démonstration invalide.');
  if (expected === 'ADMIN') return data;
  const ids = data.shops.filter(s => s.user_id === session.user.id).map(s => s.id);
  const orders = data.orders.filter(o => ids.includes(o.merchant_id));
  return { ...data, users: data.users.filter(u => orders.some(o => o.user_id === u.id)), shops: data.shops.filter(s => ids.includes(s.id)), products: data.products.filter(p => ids.includes(p.merchant_id)), groups: data.groups.filter(g => ids.includes(g.merchant_id ?? -1)), orders };
}
export function demoSnapshot(): Snapshot {
  const data = scope(read());
  for (const g of data.groups) {
    g.seconds_remaining = Math.max(0, Math.floor((Date.parse(g.deadline) - Date.now()) / 1000));
    g.total_amount = data.orders.filter(o => o.group_id === g.id && o.order_status !== 'CANCELLED').reduce((n, o) => n + o.total_amount, 0);
  }
  const orders = data.orders.filter(o => o.order_status !== 'CANCELLED');
  const successful = data.groups.filter(g => ['LOCKED', 'COMPLETED'].includes(g.status)).length;
  data.activity = {
    enabled_users: data.users.filter(u => u.status === 'ACTIVE').length,
    completed_groups: data.groups.filter(g => g.status === 'COMPLETED').length,
    overdue_open_groups: data.groups.filter(g => g.status === 'OPEN' && Date.parse(g.deadline) <= Date.now()).length,
  };
  data.impact = {users: data.users.length, merchants: data.shops.length, products: data.products.filter(p => p.status === 'ACTIVE').length, groups_created: data.groups.length, groups_active: data.groups.filter(g => g.status === 'OPEN').length, groups_successful: successful, success_rate: data.groups.length ? successful / data.groups.length : 0, orders: orders.length, units_ordered: orders.reduce((n, o) => n + o.quantity, 0), total_order_value: orders.reduce((n, o) => n + o.total_amount, 0), community_savings: orders.reduce((n, o) => n + ((data.products.find(p => p.id === o.product_id)?.individual_price ?? o.unit_price) - o.unit_price) * o.quantity, 0)};
  data.merchant = {business_name: data.shops[0]?.name ?? '', orders: orders.length, groups: data.groups.length, units: data.impact.units_ordered, revenue_simule: data.impact.total_order_value, pending_orders: orders.filter(o => o.order_status === 'PENDING').length, rows: []};
  return data;
}
export type Collection = 'users' | 'shops' | 'products' | 'groups' | 'orders';
export function demoSave(collection: Collection, id: number | null, patch: Record<string, unknown>, remove = false): number {
  const data = read(); const visible = scope(data);
  const admin = getSession()?.user.role === 'ADMIN';
  if (!admin && ['users', 'groups'].includes(collection)) throw new Error('Action non autorisée.');
  if (id !== null && !visible[collection].some(row => row.id === id)) throw new Error('Ressource introuvable dans votre espace.');
  if (!admin && collection === 'shops' && ('status' in patch || remove)) throw new Error('La validation relève de l’administration.');
  if (collection === 'products') {
    if (!admin && !visible.shops.some(s => s.user_id === getSession()!.user.id && s.status === 'APPROVED')) throw new Error('Votre boutique doit être validée pour gérer ses produits.');
    const current = data.products.find(p => p.id === id);
    const candidate = {...current, ...patch} as ManagedProduct;
    if (!remove && (!candidate.name?.trim() || !candidate.unit_label?.trim() || !Number.isInteger(candidate.stock) || candidate.stock < 1 || !Number.isInteger(candidate.individual_price) || candidate.individual_price < 1)) throw new Error('Nom, unité, stock entier et prix entier positif sont requis.');
    if (!remove && (candidate.status === 'ACTIVE' || candidate.tiers?.length)) {
      const errors = validateTiers(tierFromApi(candidate.tiers ?? []), candidate.stock);
      if (errors.length) throw new Error(errors.join(' '));
    }
  }
  if (collection === 'orders') {
    const order = data.orders.find(o => o.id === id);
    const next: Record<string, string> = {NEW: 'CONFIRMED', CONFIRMED: 'PREPARED', PREPARED: 'SHIPPED', SHIPPED: 'DELIVERED'};
    if (!order || order.order_status === 'CANCELLED' || remove || patch.delivery_status !== next[order.delivery_status] || Object.keys(patch).some(k => !['delivery_status', 'order_status'].includes(k))) throw new Error('Transition de commande non autorisée.');
  }
  if (collection === 'groups' && patch.status === 'CANCELLED') {
    const group = data.groups.find(g => g.id === id)!;
    if (group.status !== 'OPEN') throw new Error('Seul un groupe ouvert peut être annulé.');
    data.orders.filter(o => o.group_id === id).forEach(o => {o.order_status = 'CANCELLED'; o.payment_status = o.payment_status === 'SUCCESS' ? 'REFUNDED' : o.payment_status;});
    Object.assign(group, {participants_count: 0, current_quantity: 0, progress_ratio: 0, group_total_saving: 0, current_unit_price: group.product.individual_price, current_tier: {min_quantity: 1, unit_price: group.product.individual_price}, next_tier: null, quantity_to_next_tier: null, unit_saving: 0});
  }
  if (collection === 'products' && id !== null && data.orders.some(o => o.product_id === id && o.order_status !== 'CANCELLED')) {
    if (remove || ['tiers', 'individual_price', 'stock'].some(k => k in patch && JSON.stringify(patch[k]) !== JSON.stringify((data.products.find(p => p.id === id)! as unknown as Record<string, unknown>)[k]))) throw new Error('Ce produit a des commandes actives. Sa suppression et la modification des prix ou du stock sont bloquées dans la démonstration.');
  }
  const rows = data[collection] as unknown as Array<Record<string, unknown>>;
  const nextId = id ?? Math.max(0, ...rows.map(r => Number(r.id))) + 1;
  if (remove) rows.splice(rows.findIndex(r => r.id === id), 1);
  else if (id !== null) Object.assign(rows.find(r => r.id === id)!, patch);
  else rows.push({...patch, id: nextId, ...(collection === 'shops' ? {user_id: getSession()!.user.id, status: 'PENDING'} : {}), ...(collection === 'products' ? {merchant_id: visible.shops.find(s => s.user_id === getSession()!.user.id)?.id ?? 1} : {})});
  // Agrégats de réservation et libellés restent cohérents après mutation locale.
  for (const p of data.products) {
    p.reserved_units = data.orders.filter(o => o.product_id === p.id && o.order_status !== 'CANCELLED').reduce((n, o) => n + o.quantity, 0);
    for (const g of data.groups.filter(g => g.product.id === p.id)) { g.product.name = p.name; g.product.merchant_name = data.shops.find(s => s.id === p.merchant_id)?.name ?? ''; }
  }
  localStorage.setItem(KEY, JSON.stringify(data));
  return nextId;
}
export function demoTiers(id: number, tiers: TierIn[]) {
  const p = demoSnapshot().products.find(p => p.id === id);
  if (!p) throw new Error('Produit introuvable.');
  const errors = validateTiers(tierFromApi(tiers), p.stock);
  if (errors.length) throw new Error(errors.join(' '));
  demoSave('products', id, {tiers: tiers.map(({min_quantity, unit_price}) => ({min_quantity, unit_price})), best_price: tiers.at(-1)!.unit_price, status: 'ACTIVE'});
  return tiers;
}
