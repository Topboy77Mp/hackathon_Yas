"""Groupes d'achat : consultation, création, join et leave transactionnels."""

from __future__ import annotations

import secrets
import string
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import current_user, current_user_optional
from db import get_session
from models import (
    Group,
    GroupMember,
    GroupStatus,
    Order,
    OrderStatus,
    Product,
    ProductStatus,
    User,
    utcnow,
)
from schemas import (
    ErrorOut,
    GroupCard,
    GroupCreateIn,
    GroupDetail,
    JoinIn,
    JoinOut,
)
from services import (
    apply_group_pricing,
    build_group_card,
    build_group_detail,
    build_order_out,
    current_group_price,
    group_quantity,
    guard_group_open,
    notify_tier_unlocked,
    settle_expired_groups,
    settle_group_if_due,
)

router = APIRouter(tags=["groupes"])

NOT_FOUND = {404: {"model": ErrorOut, "description": "Groupe introuvable"}}
ALPHABET = string.ascii_uppercase + string.digits


def _unique_share_code(session: Session) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(ALPHABET) for _ in range(5))
        if session.exec(select(Group).where(Group.share_code == code)).first() is None:
            return code
    raise HTTPException(
        status_code=500,
        detail={"detail": "Impossible de générer un code de partage.", "code": "SHARE_CODE_EXHAUSTED"},
    )


def _lock_group(group_id: int, session: Session) -> Group:
    """Verrouille la ligne du groupe pour la durée de la transaction.

    Sans ce verrou, deux joins simultanés lisent la même quantité et calculent le
    même palier : le compteur se désynchronise en pleine démo.
    """
    group = session.exec(
        select(Group).where(Group.id == group_id).with_for_update()
    ).first()
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )
    return group


@router.get("/groups", response_model=list[GroupCard])
def list_groups(
    product_id: int | None = None, session: Session = Depends(get_session)
) -> list[GroupCard]:
    settle_expired_groups(session)
    query = select(Group).where(Group.status == GroupStatus.OPEN)
    if product_id is not None:
        query = query.where(Group.product_id == product_id)
    return [build_group_card(g, session) for g in session.exec(query).all()]


@router.get("/groups/{group_id}", response_model=GroupDetail, responses=NOT_FOUND,
            summary="Détail d'un groupe (endpoint du polling 2s)")
def get_group(
    group_id: int,
    session: Session = Depends(get_session),
    viewer: User | None = Depends(current_user_optional),
) -> GroupDetail:
    group = session.get(Group, group_id)
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )
    settle_group_if_due(group, session)
    return build_group_detail(group, session, viewer)


@router.get("/groups/code/{share_code}", response_model=GroupDetail, responses=NOT_FOUND,
            summary="Détail d'un groupe depuis un lien partagé (consultable sans compte)")
def get_group_by_code(
    share_code: str,
    session: Session = Depends(get_session),
    viewer: User | None = Depends(current_user_optional),
) -> GroupDetail:
    group = session.exec(
        select(Group).where(Group.share_code == share_code.upper())
    ).first()
    if group is None:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Groupe introuvable.", "code": "GROUP_NOT_FOUND"},
        )
    settle_group_if_due(group, session)
    return build_group_detail(group, session, viewer)


@router.post("/groups", response_model=GroupDetail, status_code=201)
def create_group(
    payload: GroupCreateIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> GroupDetail:
    product = session.exec(
        select(Product).where(Product.id == payload.product_id).with_for_update()
    ).first()
    if product is None or product.status != ProductStatus.ACTIVE:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Produit introuvable.", "code": "PRODUCT_NOT_FOUND"},
        )
    if payload.min_quantity > payload.target_quantity:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": "L'objectif minimum ne peut pas dépasser l'objectif visé.",
                "code": "MIN_ABOVE_TARGET",
            },
        )
    if payload.quantity > product.stock:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Stock insuffisant.", "code": "OUT_OF_STOCK"},
        )

    group = Group(
        creator_id=user.id,
        product_id=product.id,
        name=payload.name.strip(),
        target_quantity=payload.target_quantity,
        min_quantity=payload.min_quantity,
        deadline=utcnow() + timedelta(hours=payload.deadline_hours),
        status=GroupStatus.OPEN,
        share_code=_unique_share_code(session),
    )
    session.add(group)
    session.flush()

    # Le créateur rejoint son propre groupe : un groupe à zéro participant n'a pas de sens.
    session.add(GroupMember(group_id=group.id, user_id=user.id))
    session.add(
        Order(
            user_id=user.id,
            group_id=group.id,
            product_id=product.id,
            quantity=payload.quantity,
            unit_price=product.individual_price,
            total_amount=product.individual_price * payload.quantity,
        )
    )
    session.flush()
    apply_group_pricing(group, session)
    session.commit()
    session.refresh(group)
    return build_group_detail(group, session, user)


@router.post(
    "/groups/{group_id}/join",
    response_model=JoinOut,
    responses={**NOT_FOUND, 409: {"model": ErrorOut, "description": "Groupe fermé, déjà rejoint ou stock insuffisant"}},
)
def join_group(
    group_id: int,
    payload: JoinIn,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> JoinOut:
    """Rejoindre : création de la commande, recalcul du palier et propagation
    rétroactive à tout le groupe, le tout dans une seule transaction."""
    group = _lock_group(group_id, session)
    guard_group_open(group)

    already = session.exec(
        select(Order).where(
            Order.group_id == group.id,
            Order.user_id == user.id,
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).first()
    if already is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "detail": "Vous participez déjà à ce groupe.",
                "code": "ALREADY_JOINED",
            },
        )

    product = session.get(Product, group.product_id)
    if group_quantity(group.id, session) + payload.quantity > product.stock:
        raise HTTPException(
            status_code=409,
            detail={
                "detail": f"Stock insuffisant : il reste {max(product.stock - group_quantity(group.id, session), 0)} {product.unit_label}s.",
                "code": "OUT_OF_STOCK",
            },
        )

    previous_price = current_group_price(group, session)

    if session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.user_id == user.id
        )
    ).first() is None:
        session.add(GroupMember(group_id=group.id, user_id=user.id))

    order = Order(
        user_id=user.id,
        group_id=group.id,
        product_id=product.id,
        quantity=payload.quantity,
        unit_price=previous_price,
        total_amount=previous_price * payload.quantity,
    )
    session.add(order)
    session.flush()

    new_price = apply_group_pricing(group, session)
    tier_unlocked = new_price < previous_price
    if tier_unlocked:
        notify_tier_unlocked(group, previous_price, new_price, session)

    session.commit()
    session.refresh(order)
    session.refresh(group)

    return JoinOut(
        order=build_order_out(order, session),
        group=build_group_detail(group, session, user),
        tier_unlocked=tier_unlocked,
        previous_unit_price=previous_price,
    )


@router.post("/groups/{group_id}/leave", response_model=GroupDetail, responses=NOT_FOUND)
def leave_group(
    group_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> GroupDetail:
    group = _lock_group(group_id, session)
    guard_group_open(group)

    order = session.exec(
        select(Order).where(
            Order.group_id == group.id,
            Order.user_id == user.id,
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).first()
    if order is None:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Vous ne participez pas à ce groupe.", "code": "NOT_A_MEMBER"},
        )

    order.order_status = OrderStatus.CANCELLED
    session.add(order)

    membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.user_id == user.id
        )
    ).first()
    if membership is not None:
        session.delete(membership)

    session.flush()
    apply_group_pricing(group, session)
    session.commit()
    session.refresh(group)
    return build_group_detail(group, session, user)
