"""Moteur de paliers KashFlow.

Module pur : aucune base de données, aucun FastAPI, aucune I/O.
C'est la seule source de vérité du prix (décision D3). Ni l'app acheteur ni le
dashboard ne réimplémentent quoi que ce soit d'ici.

Rappel D1 : les paliers portent sur la QUANTITÉ commandée, jamais sur le nombre
de participants. Les montants sont des entiers de FCFA (pas de sous-unité).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence


class TierLike(Protocol):
    """Tout objet exposant ces trois attributs : le PriceTier SQLModel convient."""

    min_quantity: int
    max_quantity: int | None
    unit_price: int


@dataclass(frozen=True)
class Tier:
    min_quantity: int
    max_quantity: int | None
    unit_price: int


@dataclass(frozen=True)
class PricingSnapshot:
    """Bloc de prix d'un groupe, tel que consommé par le payload GroupDetail."""

    current_unit_price: int
    current_tier: Tier
    next_tier: Tier | None
    quantity_to_next_tier: int | None
    progress_ratio: float
    unit_saving: int
    potential_unit_saving: int
    group_total_saving: int


def sort_tiers(tiers: Sequence[TierLike]) -> list[Tier]:
    return sorted(
        (Tier(t.min_quantity, t.max_quantity, t.unit_price) for t in tiers),
        key=lambda t: t.min_quantity,
    )


def current_tier(tiers: Sequence[TierLike], quantity: int) -> Tier:
    """Palier applicable pour une quantité donnée.

    Algorithme figé par le contrat partagé. Sous le seuil du premier palier on
    renvoie ce premier palier : c'est le prix de détail, pas une erreur.
    """
    ordered = sort_tiers(tiers)
    if not ordered:
        raise ValueError("Un produit doit avoir au moins un palier.")

    tier = ordered[0]
    for t in ordered:
        if quantity >= t.min_quantity:
            tier = t
        else:
            break
    return tier


def next_tier(tiers: Sequence[TierLike], quantity: int) -> Tier | None:
    """Premier palier encore hors de portée, ou None si le meilleur est atteint.

    On compare au seuil du palier appliqué et non à la quantité seule : sous le
    premier seuil (groupe vide), le palier suivant reste le deuxième de la
    grille, pas le palier de détail déjà en vigueur.
    """
    ordered = sort_tiers(tiers)
    if not ordered:
        return None

    floor = max(quantity, current_tier(ordered, quantity).min_quantity)
    for t in ordered:
        if floor < t.min_quantity:
            return t
    return None


def quantity_to_next_tier(tiers: Sequence[TierLike], quantity: int) -> int | None:
    nxt = next_tier(tiers, quantity)
    if nxt is None:
        return None
    return max(nxt.min_quantity - quantity, 0)


def progress_ratio(current_quantity: int, target_quantity: int) -> float:
    """Avancement vers l'objectif du groupe, borné à 0..1."""
    if target_quantity <= 0:
        return 0.0
    return min(max(current_quantity / target_quantity, 0.0), 1.0)


def unit_saving(individual_price: int, applied_unit_price: int) -> int:
    return max(individual_price - applied_unit_price, 0)


def group_total_saving(
    individual_price: int, applied_unit_price: int, total_quantity: int
) -> int:
    """Économie du groupe entier.

    Équivalent à SUM((individual_price - order.unit_price) * order.quantity) tant
    que la règle rétroactive tient (D2) : toutes les orders actives partagent le
    même unit_price.
    """
    return unit_saving(individual_price, applied_unit_price) * max(total_quantity, 0)


def compute(
    tiers: Sequence[TierLike],
    total_quantity: int,
    individual_price: int,
    target_quantity: int,
) -> PricingSnapshot:
    """Assemble le bloc de prix complet d'un groupe."""
    ordered = sort_tiers(tiers)
    if not ordered:
        ordered = [Tier(1, None, individual_price)]

    applied = current_tier(ordered, total_quantity)
    nxt = next_tier(ordered, total_quantity)

    return PricingSnapshot(
        current_unit_price=applied.unit_price,
        current_tier=applied,
        next_tier=nxt,
        quantity_to_next_tier=quantity_to_next_tier(ordered, total_quantity),
        progress_ratio=progress_ratio(total_quantity, target_quantity),
        unit_saving=unit_saving(individual_price, applied.unit_price),
        potential_unit_saving=unit_saving(
            individual_price, nxt.unit_price if nxt else applied.unit_price
        ),
        group_total_saving=group_total_saving(
            individual_price, applied.unit_price, total_quantity
        ),
    )


def validate_tiers(
    tiers: Sequence[TierLike], stock: int | None = None
) -> list[str]:
    """Contrôle déterministe des invariants d'une grille de paliers.

    Renvoie la liste des erreurs en français, vide si la grille est valide.
    Utilisé à la création des paliers commerçant et pour valider la sortie IA-1.
    """
    errors: list[str] = []
    if not tiers:
        return ["Il faut au moins un palier."]

    ordered = sort_tiers(tiers)

    for t in ordered:
        if t.min_quantity < 1:
            errors.append("Un seuil de palier doit être supérieur ou égal à 1.")
        if t.unit_price < 1:
            errors.append("Un prix de palier doit être strictement positif.")
        if t.max_quantity is not None and t.max_quantity < t.min_quantity:
            errors.append(
                f"Palier {t.min_quantity} : la quantité maximale est inférieure au seuil."
            )

    for previous, following in zip(ordered, ordered[1:]):
        if following.min_quantity == previous.min_quantity:
            errors.append(f"Deux paliers partagent le seuil {previous.min_quantity}.")
        if following.unit_price >= previous.unit_price:
            errors.append(
                f"Le prix doit baisser quand le volume monte : palier "
                f"{following.min_quantity} à {following.unit_price} F "
                f"contre {previous.unit_price} F au palier {previous.min_quantity}."
            )
        if (
            previous.max_quantity is not None
            and previous.max_quantity >= following.min_quantity
        ):
            errors.append(
                f"Chevauchement entre les paliers {previous.min_quantity} et "
                f"{following.min_quantity}."
            )

    if ordered[-1].max_quantity is not None:
        errors.append("Le dernier palier doit être ouvert (pas de quantité maximale).")

    if stock is not None and ordered[-1].min_quantity > stock:
        errors.append(
            f"Le dernier palier ({ordered[-1].min_quantity}) dépasse le stock disponible ({stock})."
        )

    return errors
