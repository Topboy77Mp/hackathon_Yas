"""Outil de démonstration : faire monter le compteur d'un groupe en direct.

Protégé par un jeton de démo, jamais exposé publiquement. C'est ce qui déclenche
le franchissement de palier devant le jury sans cliquer trente fois.
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, func, select

from auth import hash_password
from config import DEMO_TOKEN
from db import get_session
from models import Group, GroupMember, Order, Product, User, UserRole
from schemas import ErrorOut, GroupDetail
from services import (
    apply_group_pricing,
    build_group_detail,
    current_group_price,
    group_quantity,
    guard_group_open,
    notify_tier_unlocked,
)

router = APIRouter(tags=["démonstration"])

PRENOMS = ["Kodjo", "Afi", "Yao", "Akossiwa", "Kossi", "Amivi", "Komlan", "Ayélé",
           "Sena", "Essi", "Mawuli", "Adjoa", "Kofi", "Abra", "Edem", "Dzifa"]
NOMS = ["Agbeko", "Amegan", "Bawa", "Dogbe", "Fiawoo", "Gbedemah", "Kpodar",
        "Lawson", "Mensah", "Nyavor", "Sossou", "Tamakloe", "Vodouhe", "Wilson"]


class SimulateJoinsIn(BaseModel):
    group_id: int
    count: int = Field(default=5, ge=1, le=200, description="participants fictifs à ajouter")
    quantity: int = Field(default=3, ge=1, le=50, description="quantité par participant")


class SimulateJoinsOut(BaseModel):
    added_participants: int
    added_quantity: int
    previous_unit_price: int
    new_unit_price: int
    tier_unlocked: bool
    group: GroupDetail


def require_demo_token(x_demo_token: Annotated[str | None, Header()] = None) -> None:
    if not x_demo_token or not secrets.compare_digest(x_demo_token, DEMO_TOKEN):
        raise HTTPException(
            status_code=403,
            detail={"detail": "Jeton de démonstration invalide.", "code": "BAD_DEMO_TOKEN"},
        )


@router.post(
    "/demo/simulate-joins",
    response_model=SimulateJoinsOut,
    responses={403: {"model": ErrorOut}, 404: {"model": ErrorOut}, 409: {"model": ErrorOut}},
    summary="Ajoute N participants fictifs à un groupe (jeton de démo requis)",
)
def simulate_joins(
    payload: SimulateJoinsIn,
    _: None = Depends(require_demo_token),
    session: Session = Depends(get_session),
) -> SimulateJoinsOut:
    group = session.exec(
        select(Group).where(Group.id == payload.group_id).with_for_update()
    ).first()
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )
    guard_group_open(group)

    product = session.get(Product, group.product_id)
    added_quantity = payload.count * payload.quantity
    if group_quantity(group.id, session) + added_quantity > product.stock:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Stock insuffisant pour cette simulation.", "code": "OUT_OF_STOCK"},
        )

    previous_price = current_group_price(group, session)

    # Un seul hachage réutilisé : bcrypt coûte ~100 ms, trente fois c'est une
    # démo qui se fige devant le jury.
    shared_hash = hash_password(secrets.token_urlsafe(16))
    offset = int(
        session.exec(
            select(func.count()).select_from(User).where(User.phone.like("+22899%"))
        ).one()
    )

    for i in range(payload.count):
        member = User(
            first_name=PRENOMS[(offset + i) % len(PRENOMS)],
            last_name=NOMS[(offset + i) % len(NOMS)],
            phone=f"+22899{offset + i + 1:06d}",
            password_hash=shared_hash,
            role=UserRole.USER,
        )
        session.add(member)
        session.flush()
        session.add(GroupMember(group_id=group.id, user_id=member.id))
        session.add(
            Order(
                user_id=member.id,
                group_id=group.id,
                product_id=product.id,
                quantity=payload.quantity,
                unit_price=previous_price,
                total_amount=previous_price * payload.quantity,
            )
        )

    session.flush()
    new_price = apply_group_pricing(group, session)
    tier_unlocked = new_price < previous_price
    if tier_unlocked:
        notify_tier_unlocked(group, previous_price, new_price, session)

    session.commit()
    session.refresh(group)

    return SimulateJoinsOut(
        added_participants=payload.count,
        added_quantity=added_quantity,
        previous_unit_price=previous_price,
        new_unit_price=new_price,
        tier_unlocked=tier_unlocked,
        group=build_group_detail(group, session, None),
    )
