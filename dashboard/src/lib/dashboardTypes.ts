/** Modèle d’affichage stable du dashboard, indépendant des versions de payload backend. */
export interface ImpactView {
  totalSavings: number;
  activeGroups: number;
  activeGroupsLabel: string;
  successfulGroups: number;
  audience: number;
  audienceLabel: string;
  orderedUnits: number;
  totalValue: number;
}
