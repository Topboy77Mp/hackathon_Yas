export interface OfferTier {
  id: string;
  minQuantity: number;
  unitPrice: number;
}

export interface MerchantOffer {
  id: string;
  name: string;
  unitLabel: string;
  stock: number;
  individualPrice: number;
  status: "ACTIVE" | "DRAFT";
  groups: number;
  reservedUnits: number;
  tiers: OfferTier[];
}

export const offerFixtures: MerchantOffer[] = [
  {
    id: "npk-50",
    name: "Engrais NPK 15-15-15",
    unitLabel: "sac",
    stock: 600,
    individualPrice: 22_000,
    status: "ACTIVE",
    groups: 1,
    reservedUnits: 146,
    tiers: [
      { id: "tier-1", minQuantity: 1, unitPrice: 22_000 },
      { id: "tier-2", minQuantity: 50, unitPrice: 20_500 },
      { id: "tier-3", minQuantity: 100, unitPrice: 19_000 },
      { id: "tier-4", minQuantity: 200, unitPrice: 17_500 },
    ],
  },
  {
    id: "mais-25",
    name: "Semences de maïs améliorées",
    unitLabel: "sachet",
    stock: 320,
    individualPrice: 5_500,
    status: "DRAFT",
    groups: 0,
    reservedUnits: 0,
    tiers: [
      { id: "tier-1", minQuantity: 1, unitPrice: 5_500 },
      { id: "tier-2", minQuantity: 40, unitPrice: 5_100 },
      { id: "tier-3", minQuantity: 100, unitPrice: 4_700 },
    ],
  },
];

export const activeGroupFixture = {
  id: "kov-2026",
  name: "Producteurs de Kovié",
  productName: "Engrais NPK 15-15-15",
  currentQuantity: 146,
  targetQuantity: 200,
  participants: 38,
  currentPrice: 19_000,
  nextPrice: 17_500,
  deadline: "dans 1 j 14 h",
};

export const merchantDashboardFixture = {
  businessName: "Agro-Intrants Zio",
  orders: 38,
  groups: 1,
  units: 146,
  revenue: 2_774_000,
  pendingOrders: 38,
  rows: [
    {
      groupId: "kov-2026",
      groupName: "Producteurs de Kovié",
      productName: "Engrais NPK 15-15-15",
      participants: 38,
      currentQuantity: 146,
      targetQuantity: 200,
      currentUnitPrice: 19_000,
      totalAmount: 2_774_000,
      status: "OPEN",
    },
  ],
};
