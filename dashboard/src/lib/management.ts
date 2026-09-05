import { api } from './api/client';
import { getImpact, getMerchantDashboard, getMerchantProducts, getGroup, getProduct } from './api/endpoints';
import type { GroupDetail, ImpactStats, MerchantDashboard, MerchantProductRow, UserOut } from './api/types';
import { getSession } from './session';
import { demoSnapshot, isDemo } from './demo';

export interface Person extends UserOut { status: string }
export interface Shop { id: number; user_id: number; name: string; description: string; location: string; status: string }
export interface ManagedProduct extends MerchantProductRow { merchant_id: number; description: string; category: string; location: string; delivery_days: number | null; duration_days: number | null }
export interface ManagedOrder { id: number; user_id: number; group_id: number; product_id: number; merchant_id: number; quantity: number; unit_price: number; total_amount: number; payment_status: string; order_status: string; delivery_status: string; created_at: string; transaction_reference: string }
export interface ManagedGroup extends GroupDetail { creator_id?: number; merchant_id?: number; total_amount?: number }
export interface Snapshot { products: ManagedProduct[]; groups: ManagedGroup[]; users: Person[]; shops: Shop[]; orders: ManagedOrder[]; impact?: ImpactStats; merchant?: MerchantDashboard; activity?: { enabled_users: number; completed_groups: number; overdue_open_groups: number }; missing: string[] }

export async function loadManagement(): Promise<Snapshot> {
  if (isDemo()) return demoSnapshot();
  const user = getSession()?.user;
  if (!user || !['ADMIN', 'MERCHANT'].includes(user.role)) throw new Error('Accès réservé aux comptes professionnels.');
  const result: Snapshot = { products: [], groups: [], users: [], shops: [], orders: [], missing: ['users', 'shops', 'orders', 'mutations'] };
  if (user.role === 'MERCHANT') {
    const [merchant, products] = await Promise.all([getMerchantDashboard(), getMerchantProducts()]);
    result.merchant = merchant;
    result.products = products.map(p => ({ ...p, merchant_id: 0, description: '', category: '', location: '', delivery_days: null, duration_days: null }));
    // La liste privée constitue le contrôle de périmètre avant tout GET public.
    result.groups = await Promise.all(merchant.rows.map(async row => ({...await getGroup(row.group_id), total_amount: row.total_amount})));
  } else {
    const [impact, groups, products] = await Promise.all([getImpact(), api<{id: number}[]>('/groups'), api<{id: number}[]>('/products')]);
    result.impact = impact;
    result.groups = await Promise.all(groups.map(g => getGroup(g.id)));
    result.products = await Promise.all(products.map(async p => {
      const detail = await getProduct(p.id);
      return { ...detail, description: detail.description ?? '', merchant_id: 0, category: '', location: detail.merchant_location ?? '', delivery_days: null, duration_days: null, best_price: detail.tiers.at(-1)?.unit_price ?? detail.individual_price, status: 'ACTIVE' as const, groups_count: detail.open_groups.length, reserved_units: 0 };
    }));
    result.missing.push('all-products', 'closed-groups');
  }
  return result;
}
