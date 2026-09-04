"""Schémas de réponse — reflet exact du <contrat_partage>.

Toute divergence entre ces modèles et le contrat est un incident à signaler dans
docs/handoff/contract-changes.md, jamais une correction silencieuse.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from models import GroupStatus


class TierOut(BaseModel):
    min_quantity: int
    unit_price: int


class GroupProductOut(BaseModel):
    id: int
    name: str
    unit_label: str
    image_url: str | None
    individual_price: int
    merchant_name: str


class MembershipOut(BaseModel):
    joined: bool
    order_id: int
    quantity: int
    total_amount: int


class GroupDetail(BaseModel):
    id: int
    name: str
    share_code: str
    status: GroupStatus
    deadline: datetime
    seconds_remaining: int

    product: GroupProductOut

    participants_count: int
    current_quantity: int
    target_quantity: int
    min_quantity: int

    current_unit_price: int
    current_tier: TierOut
    next_tier: TierOut | None
    quantity_to_next_tier: int | None
    progress_ratio: float

    unit_saving: int
    potential_unit_saving: int
    group_total_saving: int

    my_membership: MembershipOut | None


class ErrorOut(BaseModel):
    """Réponse d'erreur uniforme : le front ne devine pas."""

    detail: str
    code: str
