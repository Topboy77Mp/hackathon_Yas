/**
 * KashFlow — Fixtures de démonstration
 * Reproduisent exactement les payloads du contrat (GroupDetail, ProductDetail, ImpactStats)
 * pour que AGENT_FRONT ne soit jamais bloqué par l'avancement d'AGENT_BACK.
 * Activées par le flag USE_MOCKS (voir lib/config.ts).
 * Jeu de données : docs/PROMPT-CONCEPTION.xml, <jeu_de_donnees_demo>.
 */

import type {
  GroupDetail,
  GroupCard,
  ProductCard,
  ProductDetail,
  ImpactStats,
  User,
  Order,
} from '@shared/api/types';

const HOURS = 60 * 60;
const now = Date.now();

function deadlineIn(seconds: number) {
  return new Date(now + seconds * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Groupe « Producteurs de Kovié » — état initial de la démo (146/200 sacs)
// ---------------------------------------------------------------------------

const KOVIE_SECONDS_REMAINING = (1 * 24 + 14) * HOURS; // ~ 1 j 14 h, cf. docs/design/screens.md

const npkProductSummary = {
  id: 'prod_npk_15_15_15',
  name: 'Engrais NPK 15-15-15 — sac de 50 kg',
  unit_label: 'sac',
  image_url: 'https://images.kashflow.demo/npk-15-15-15.jpg',
  individual_price: 22000,
  merchant_name: 'Agro-Intrants Zio',
};

/** Groupe en cours, non rejoint : c'est l'état par défaut affiché à un visiteur. */
export const groupDetailFixture: GroupDetail = {
  id: 'grp_kovie_demo',
  name: 'Producteurs de Kovié',
  share_code: 'KOVIE2026',
  status: 'OPEN',
  deadline: deadlineIn(KOVIE_SECONDS_REMAINING),
  seconds_remaining: KOVIE_SECONDS_REMAINING,
  product: npkProductSummary,
  participants_count: 38,
  current_quantity: 146,
  target_quantity: 200,
  min_quantity: 100,
  current_unit_price: 19000,
  current_tier: { min_quantity: 100, unit_price: 19000 },
  next_tier: { min_quantity: 200, unit_price: 17500 },
  quantity_to_next_tier: 54,
  progress_ratio: 146 / 200,
  unit_saving: 22000 - 19000,
  potential_unit_saving: 22000 - 17500,
  group_total_saving: (22000 - 19000) * 146,
  my_membership: null,
};

/** Même groupe, une fois que l'utilisateur courant a rejoint avec 4 sacs. */
export const groupDetailJoinedFixture: GroupDetail = {
  ...groupDetailFixture,
  participants_count: 39,
  current_quantity: 150,
  quantity_to_next_tier: 50,
  progress_ratio: 150 / 200,
  group_total_saving: (22000 - 19000) * 150,
  my_membership: {
    joined: true,
    order_id: 'ord_demo_self',
    quantity: 4,
    total_amount: 4 * 19000,
  },
};

/**
 * État après franchissement du palier 200 sacs — cible de la démo (900 000 F d'économie
 * communautaire). Utile pour tester la détection de changement de palier dans
 * useGroupPolling sans dépendre du backend.
 */
export const groupDetailUnlockedFixture: GroupDetail = {
  ...groupDetailFixture,
  participants_count: 52,
  current_quantity: 200,
  current_unit_price: 17500,
  current_tier: { min_quantity: 200, unit_price: 17500 },
  next_tier: null,
  quantity_to_next_tier: null,
  progress_ratio: 1,
  unit_saving: 22000 - 17500,
  potential_unit_saving: 0,
  group_total_saving: (22000 - 17500) * 200,
  my_membership: {
    joined: true,
    order_id: 'ord_demo_self',
    quantity: 4,
    total_amount: 4 * 17500,
  },
};

const kovieGroupCard: GroupCard = {
  id: groupDetailFixture.id,
  name: groupDetailFixture.name,
  share_code: groupDetailFixture.share_code,
  status: groupDetailFixture.status,
  deadline: groupDetailFixture.deadline,
  seconds_remaining: groupDetailFixture.seconds_remaining,
  participants_count: groupDetailFixture.participants_count,
  current_quantity: groupDetailFixture.current_quantity,
  target_quantity: groupDetailFixture.target_quantity,
  current_unit_price: groupDetailFixture.current_unit_price,
  progress_ratio: groupDetailFixture.progress_ratio,
};

// ---------------------------------------------------------------------------
// Catalogue — 3 produits seedés
// ---------------------------------------------------------------------------

export const productCardsFixture: ProductCard[] = [
  {
    id: 'prod_npk_15_15_15',
    name: 'Engrais NPK 15-15-15 — sac de 50 kg',
    description:
      "Engrais minéral composé NPK 15-15-15, sac de 50 kg. Adapté aux cultures vivrières.",
    unit_label: 'sac',
    image_url: 'https://images.kashflow.demo/npk-15-15-15.jpg',
    individual_price: 22000,
    merchant_name: 'Agro-Intrants Zio',
    status: 'ACTIVE',
  },
  {
    id: 'prod_semences_mais',
    name: 'Semences de maïs améliorées — sachet 5 kg',
    description:
      "Semences de maïs améliorées, sachet de 5 kg. Rendement supérieur en zone soudanienne.",
    unit_label: 'sachet',
    image_url: 'https://images.kashflow.demo/semences-mais.jpg',
    individual_price: 6500,
    merchant_name: 'Agro-Intrants Zio',
    status: 'ACTIVE',
  },
  {
    id: 'prod_kit_scolaire',
    name: 'Kit scolaire complet',
    description:
      "Cahiers, stylos, ardoise et cartable. Kit complet pour une année scolaire.",
    unit_label: 'kit',
    image_url: 'https://images.kashflow.demo/kit-scolaire.jpg',
    individual_price: 12000,
    merchant_name: 'Agro-Intrants Zio',
    status: 'ACTIVE',
  },
];

export const productDetailFixture: ProductDetail = {
  id: 'prod_npk_15_15_15',
  merchant_id: 'merch_agro_zio',
  name: 'Engrais NPK 15-15-15 — sac de 50 kg',
  description:
    "Engrais minéral composé NPK 15-15-15, sac de 50 kg. Adapté aux cultures vivrières de la région des Plateaux.",
  unit_label: 'sac',
  image_url: 'https://images.kashflow.demo/npk-15-15-15.jpg',
  stock: 600,
  individual_price: 22000,
  status: 'ACTIVE',
  created_at: deadlineIn(-30 * 24 * HOURS),
  merchant_name: 'Agro-Intrants Zio',
  tiers: [
    { id: 'tier_1', product_id: 'prod_npk_15_15_15', min_quantity: 1, max_quantity: 49, unit_price: 22000 },
    { id: 'tier_2', product_id: 'prod_npk_15_15_15', min_quantity: 50, max_quantity: 99, unit_price: 20500 },
    { id: 'tier_3', product_id: 'prod_npk_15_15_15', min_quantity: 100, max_quantity: 199, unit_price: 19000 },
    { id: 'tier_4', product_id: 'prod_npk_15_15_15', min_quantity: 200, max_quantity: null, unit_price: 17500 },
  ],
  open_groups: [kovieGroupCard],
};

// ---------------------------------------------------------------------------
// Dashboard jury — KPI d'impact (page /dashboard, fixtures partagées pour AGENT_DASH)
// ---------------------------------------------------------------------------

export const impactStatsFixture: ImpactStats = {
  total_savings: 612000,
  active_groups_count: 3,
  completed_groups_count: 5,
  participants_count: 187,
  units_ordered: 812,
  total_value: 15420000,
};

// ---------------------------------------------------------------------------
// Auth mockée — permet de tester tout le parcours connecté sans backend
// (inscription/connexion/rejoindre), cf. lib/api/endpoints.ts.
// ---------------------------------------------------------------------------

export const demoUserFixture: User = {
  id: 'user_demo_self',
  first_name: 'Awa',
  last_name: 'Koffi',
  phone: '90 00 00 00',
  role: 'USER',
  created_at: deadlineIn(-90 * 24 * HOURS),
};

export const mockAuthToken = 'mock-jwt-token';

/**
 * Simule ce que ferait le backend au join : nouvelle Order + Group recalculé avec la
 * quantité choisie. Ne sert QUE de doublure de serveur en l'absence de backend — la
 * logique de prix ne doit jamais vivre dans un écran ou un composant (D3).
 */
export function buildJoinFixture(quantity: number): { order: Order; group: GroupDetail } {
  const safeQuantity = Math.max(1, Math.round(quantity));
  const unitPrice = groupDetailFixture.current_unit_price;
  const newQuantity = groupDetailFixture.current_quantity + safeQuantity;
  const nextTier = groupDetailFixture.next_tier;
  const quantityToNextTier = nextTier ? Math.max(0, nextTier.min_quantity - newQuantity) : null;

  const order: Order = {
    id: 'ord_demo_self',
    user_id: demoUserFixture.id,
    group_id: groupDetailFixture.id,
    product_id: groupDetailFixture.product.id,
    quantity: safeQuantity,
    unit_price: unitPrice,
    total_amount: safeQuantity * unitPrice,
    payment_status: 'PENDING',
    order_status: 'PENDING',
    created_at: new Date().toISOString(),
  };

  const group: GroupDetail = {
    ...groupDetailFixture,
    participants_count: groupDetailFixture.participants_count + 1,
    current_quantity: newQuantity,
    quantity_to_next_tier: quantityToNextTier,
    progress_ratio: Math.min(1, newQuantity / groupDetailFixture.target_quantity),
    group_total_saving: groupDetailFixture.unit_saving * newQuantity,
    my_membership: {
      joined: true,
      order_id: order.id,
      quantity: safeQuantity,
      total_amount: order.total_amount,
    },
  };

  return { order, group };
}
