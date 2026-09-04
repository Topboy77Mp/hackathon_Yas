"""Logique applicative partagée par les routeurs.

Le calcul de palier lui-même vit dans `pricing.py` et nulle part ailleurs.
Ce module l'applique à la base : propagation rétroactive, assemblage des payloads.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlmodel import Session, func, select

import pricing
from models import (
    Group,
    GroupMember,
    GroupStatus,
    Merchant,
    Notification,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    PriceTier,
    Product,
    User,
    utcnow,
)
from schemas import (
    GroupCard,
    GroupDetail,
    GroupProductOut,
    MembershipOut,
    OrderOut,
    TierOut,
)


def aware(dt):
    """Les colonnes PostgreSQL sont naïves ; on les rend comparables à utcnow()."""
    return dt if dt.tzinfo else dt.replace(tzinfo=utcnow().tzinfo)


def seconds_remaining(group: Group) -> int:
    return max(int((aware(group.deadline) - utcnow()).total_seconds()), 0)


def active_orders(group_id: int, session: Session) -> list[Order]:
    return list(
        session.exec(
            select(Order).where(
                Order.group_id == group_id,
                Order.order_status != OrderStatus.CANCELLED,
            )
        ).all()
    )


def group_quantity(group_id: int, session: Session) -> int:
    """Invariant du contrat : jamais stocké en dur, toujours recalculé."""
    total = session.exec(
        select(func.coalesce(func.sum(Order.quantity), 0)).where(
            Order.group_id == group_id,
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).one()
    return int(total)


def participants_count(group_id: int, session: Session) -> int:
    return int(
        session.exec(
            select(func.count())
            .select_from(GroupMember)
            .where(GroupMember.group_id == group_id)
        ).one()
    )


def product_tiers(product_id: int, session: Session) -> list[PriceTier]:
    return list(
        session.exec(
            select(PriceTier)
            .where(PriceTier.product_id == product_id)
            .order_by(PriceTier.min_quantity)
        ).all()
    )


def current_group_price(group: Group, session: Session) -> int:
    """Prix en vigueur pour le groupe, lu sur les commandes déjà en place.

    À appeler AVANT d'insérer une nouvelle commande : une fois celle-ci ajoutée,
    elle fausserait la lecture du prix précédent.
    """
    orders = active_orders(group.id, session)
    if orders:
        return orders[0].unit_price
    product = session.get(Product, group.product_id)
    return product.individual_price


def apply_group_pricing(group: Group, session: Session) -> int:
    """Recalcule le palier du groupe et propage le prix à TOUTES les orders actives.

    Règle rétroactive (D2) : après cet appel, toutes les commandes non annulées du
    groupe partagent le même `unit_price`. Renvoie le nouveau prix unitaire.
    N'émet pas de commit : l'appelant décide de la transaction.
    """
    product = session.get(Product, group.product_id)
    tiers = product_tiers(group.product_id, session)
    orders = active_orders(group.id, session)

    total_quantity = sum(o.quantity for o in orders)
    new_price = pricing.compute(
        tiers, total_quantity, product.individual_price, group.target_quantity
    ).current_unit_price

    for order in orders:
        if order.unit_price != new_price:
            order.unit_price = new_price
            order.total_amount = new_price * order.quantity
            session.add(order)

    return new_price


def notify_tier_unlocked(
    group: Group, previous_price: int, new_price: int, session: Session
) -> None:
    members = session.exec(
        select(GroupMember).where(GroupMember.group_id == group.id)
    ).all()
    for member in members:
        session.add(
            Notification(
                user_id=member.user_id,
                type="TIER_UNLOCKED",
                title="Nouveau palier débloqué",
                message=(
                    f"{group.name} : le prix passe de {previous_price} à "
                    f"{new_price} FCFA. Tout le groupe en profite."
                ),
            )
        )


def settle_group_if_due(group: Group, session: Session) -> bool:
    """Applique la règle D8 lorsque la date limite est passée.

    Objectif minimum atteint : le groupe passe LOCKED et les commandes sont
    confirmées. Sinon : groupe CANCELLED, commandes CANCELLED, paiements
    REFUNDED (simulé). Narratif du pitch : autorisation au join, débit à la
    clôture.

    Évaluation paresseuse, déclenchée à la lecture : pas d'ordonnanceur, pas de
    tâche de fond. Idempotent — deux appels concurrents aboutissent au même
    état terminal.
    """
    if group.status != GroupStatus.OPEN or seconds_remaining(group) > 0:
        return False

    orders = active_orders(group.id, session)
    reached = sum(o.quantity for o in orders) >= group.min_quantity

    if reached:
        group.status = GroupStatus.LOCKED
        for order in orders:
            order.order_status = OrderStatus.CONFIRMED
            session.add(order)
    else:
        group.status = GroupStatus.CANCELLED
        for order in orders:
            order.order_status = OrderStatus.CANCELLED
            order.payment_status = PaymentStatus.REFUNDED
            session.add(order)
            for payment in session.exec(
                select(Payment).where(Payment.order_id == order.id)
            ).all():
                payment.status = PaymentStatus.REFUNDED
                session.add(payment)

        for member in session.exec(
            select(GroupMember).where(GroupMember.group_id == group.id)
        ).all():
            session.add(
                Notification(
                    user_id=member.user_id,
                    type="GROUP_CANCELLED",
                    title="Groupe annulé",
                    message=(
                        f"{group.name} n'a pas atteint son objectif minimum de "
                        f"{group.min_quantity} unités avant la date limite. "
                        f"Votre commande est annulée et remboursée."
                    ),
                )
            )

    session.add(group)
    session.commit()
    session.refresh(group)
    return True


def build_group_detail(
    group: Group, session: Session, viewer: User | None
) -> GroupDetail:
    """Payload auto-suffisant de l'écran groupe : un seul appel doit suffire."""
    product = session.get(Product, group.product_id)
    if product is None:
        raise HTTPException(
            status_code=500,
            detail={"detail": "Produit introuvable pour ce groupe.", "code": "PRODUCT_MISSING"},
        )

    merchant = session.get(Merchant, product.merchant_id)
    orders = active_orders(group.id, session)
    current_quantity = sum(o.quantity for o in orders)

    snap = pricing.compute(
        product_tiers(product.id, session),
        current_quantity,
        product.individual_price,
        group.target_quantity,
    )

    membership = None
    if viewer is not None:
        mine = next((o for o in orders if o.user_id == viewer.id), None)
        if mine is not None:
            membership = MembershipOut(
                joined=True,
                order_id=mine.id,
                quantity=mine.quantity,
                total_amount=mine.total_amount,
            )

    return GroupDetail(
        id=group.id,
        name=group.name,
        share_code=group.share_code,
        status=group.status,
        deadline=group.deadline,
        seconds_remaining=seconds_remaining(group),
        product=GroupProductOut(
            id=product.id,
            name=product.name,
            unit_label=product.unit_label,
            image_url=product.image_url,
            individual_price=product.individual_price,
            merchant_name=merchant.business_name if merchant else "",
        ),
        participants_count=participants_count(group.id, session),
        current_quantity=current_quantity,
        target_quantity=group.target_quantity,
        min_quantity=group.min_quantity,
        current_unit_price=snap.current_unit_price,
        current_tier=TierOut(
            min_quantity=snap.current_tier.min_quantity,
            unit_price=snap.current_tier.unit_price,
        ),
        next_tier=(
            TierOut(
                min_quantity=snap.next_tier.min_quantity,
                unit_price=snap.next_tier.unit_price,
            )
            if snap.next_tier
            else None
        ),
        quantity_to_next_tier=snap.quantity_to_next_tier,
        progress_ratio=snap.progress_ratio,
        unit_saving=snap.unit_saving,
        potential_unit_saving=snap.potential_unit_saving,
        group_total_saving=snap.group_total_saving,
        my_membership=membership,
    )


def build_group_card(group: Group, session: Session) -> GroupCard:
    product = session.get(Product, group.product_id)
    current_quantity = group_quantity(group.id, session)
    snap = pricing.compute(
        product_tiers(group.product_id, session),
        current_quantity,
        product.individual_price,
        group.target_quantity,
    )
    return GroupCard(
        id=group.id,
        name=group.name,
        share_code=group.share_code,
        status=group.status,
        participants_count=participants_count(group.id, session),
        current_quantity=current_quantity,
        target_quantity=group.target_quantity,
        current_unit_price=snap.current_unit_price,
        progress_ratio=snap.progress_ratio,
        seconds_remaining=seconds_remaining(group),
    )


def build_order_out(order: Order, session: Session) -> OrderOut:
    product = session.get(Product, order.product_id)
    group = session.get(Group, order.group_id)
    return OrderOut(
        id=order.id,
        group_id=order.group_id,
        group_name=group.name if group else "",
        product_id=order.product_id,
        product_name=product.name if product else "",
        unit_label=product.unit_label if product else "unité",
        quantity=order.quantity,
        unit_price=order.unit_price,
        total_amount=order.total_amount,
        individual_price=product.individual_price if product else order.unit_price,
        saving=(
            (product.individual_price - order.unit_price) * order.quantity
            if product
            else 0
        ),
        payment_status=order.payment_status,
        order_status=order.order_status,
        created_at=order.created_at,
    )


def guard_group_open(group: Group) -> None:
    if group.status != GroupStatus.OPEN:
        raise HTTPException(
            status_code=409,
            detail={
                "detail": f"Ce groupe n'accepte plus de participants (statut {group.status.value}).",
                "code": "GROUP_NOT_OPEN",
            },
        )
    if seconds_remaining(group) == 0:
        raise HTTPException(
            status_code=409,
            detail={"detail": "La date limite de ce groupe est dépassée.", "code": "GROUP_EXPIRED"},
        )
