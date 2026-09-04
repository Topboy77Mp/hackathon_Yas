"""Commandes et paiement simulé."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import current_user
from db import get_session
from models import Order, OrderStatus, Payment, PaymentStatus, User
from schemas import ErrorOut, OrderOut, PayOut, PaymentOut
from services import build_order_out

router = APIRouter(tags=["commandes"])


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    user: User = Depends(current_user), session: Session = Depends(get_session)
) -> list[OrderOut]:
    orders = session.exec(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    ).all()
    return [build_order_out(o, session) for o in orders]


@router.get("/orders/{order_id}", response_model=OrderOut,
            responses={404: {"model": ErrorOut, "description": "Commande introuvable"}})
def get_order(
    order_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> OrderOut:
    order = session.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Commande introuvable.", "code": "ORDER_NOT_FOUND"},
        )
    return build_order_out(order, session)


@router.post(
    "/orders/{order_id}/pay",
    response_model=PayOut,
    responses={
        404: {"model": ErrorOut, "description": "Commande introuvable"},
        409: {"model": ErrorOut, "description": "Commande déjà payée ou annulée"},
    },
)
def pay_order(
    order_id: int,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> PayOut:
    """Paiement simulé. Aucun appel externe : le statut passe directement à SUCCESS.

    Narratif du pitch : autorisation au join, débit à la clôture (D8).
    """
    order = session.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Commande introuvable.", "code": "ORDER_NOT_FOUND"},
        )
    if order.order_status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Cette commande est annulée.", "code": "ORDER_CANCELLED"},
        )
    if order.payment_status == PaymentStatus.SUCCESS:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Cette commande est déjà payée.", "code": "ALREADY_PAID"},
        )

    payment = Payment(
        order_id=order.id,
        amount=order.total_amount,
        method="MOCK",
        status=PaymentStatus.SUCCESS,
    )
    session.add(payment)
    session.flush()
    payment.transaction_reference = f"KF-{payment.id:06d}"

    order.payment_status = PaymentStatus.SUCCESS
    order.order_status = OrderStatus.CONFIRMED
    session.add_all([payment, order])
    session.commit()
    session.refresh(payment)
    session.refresh(order)

    return PayOut(
        payment=PaymentOut.model_validate(payment, from_attributes=True),
        order=build_order_out(order, session),
    )
