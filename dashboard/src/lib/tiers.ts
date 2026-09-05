/**
 * Édition d'une grille de paliers, côté interface.
 *
 * `validateTiers` reproduit les invariants de `backend/pricing.validate_tiers`.
 * Ce n'est **pas** un calcul de prix — le contrat interdit ceux-ci côté client —
 * mais un contrôle de saisie : sans lui, le commerçant découvrait une grille
 * refusée seulement après l'envoi, sous forme d'un 422 laconique.
 *
 * Le serveur reste l'autorité : il revalide tout et peut refuser malgré tout.
 */

import type { Tier, TierIn } from "./api/types";

export interface EditableTier {
  id: string;
  minQuantity: number;
  unitPrice: number;
}

let compteur = 0;
function nouvelIdentifiant(): string {
  compteur += 1;
  return `palier-${compteur}`;
}

export function tierFromApi(tiers: Tier[]): EditableTier[] {
  return tiers.map((tier) => ({
    id: nouvelIdentifiant(),
    minQuantity: tier.min_quantity,
    unitPrice: tier.unit_price,
  }));
}

export function paliersuivant(
  tiers: EditableTier[],
  stock: number,
  retailPrice: number,
): EditableTier {
  const dernier = tiers.at(-1);
  const seuil = dernier ? dernier.minQuantity * 2 : 1;
  return {
    id: nouvelIdentifiant(),
    minQuantity: dernier ? Math.min(Math.max(seuil, 2), Math.max(stock, 2)) : 1,
    unitPrice: dernier
      ? Math.max(Math.round(dernier.unitPrice * 0.92), 1)
      : Math.max(Math.round(retailPrice), 1),
  };
}

/**
 * Traduit la grille éditée dans la forme attendue par l'API.
 * `max_quantity` se déduit du seuil suivant ; le dernier palier reste ouvert.
 */
export function toApiTiers(tiers: EditableTier[]): TierIn[] {
  const tries = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  return tries.map((tier, index) => ({
    min_quantity: tier.minQuantity,
    max_quantity: tries[index + 1] ? tries[index + 1].minQuantity - 1 : null,
    unit_price: tier.unitPrice,
  }));
}

/** Mêmes règles que `pricing.validate_tiers`, plus le premier palier à 1. */
export function validateTiers(tiers: EditableTier[], stock: number): string[] {
  const erreurs: string[] = [];
  if (tiers.length === 0) return ["Il faut au moins un palier."];

  const tries = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  for (const tier of tries) {
    if (!Number.isInteger(tier.minQuantity) || tier.minQuantity < 1) {
      erreurs.push("Un seuil de palier doit être supérieur ou égal à 1.");
    }
    if (!Number.isInteger(tier.unitPrice) || tier.unitPrice < 1) {
      erreurs.push("Un prix de palier doit être strictement positif.");
    }
  }

  if (tries[0].minQuantity !== 1) {
    erreurs.push("Le premier palier doit commencer à 1 unité.");
  }

  for (let index = 0; index < tries.length - 1; index += 1) {
    const precedent = tries[index];
    const suivant = tries[index + 1];

    if (suivant.minQuantity === precedent.minQuantity) {
      erreurs.push(`Deux paliers partagent le seuil ${precedent.minQuantity}.`);
    }
    if (suivant.unitPrice >= precedent.unitPrice) {
      erreurs.push(
        `Le prix doit baisser quand le volume monte : le palier ${suivant.minQuantity} ` +
          `n’est pas moins cher que le palier ${precedent.minQuantity}.`,
      );
    }
  }

  if (stock > 0 && tries[tries.length - 1].minQuantity > stock) {
    erreurs.push(
      `Le dernier palier (${tries[tries.length - 1].minQuantity}) dépasse le stock disponible (${stock}).`,
    );
  }

  return [...new Set(erreurs)];
}
