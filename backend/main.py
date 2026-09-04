"""API KashFlow.

Phase 1A : GET /groups/{id} et GET /groups/code/{share_code} uniquement.
Le reste des endpoints du contrat arrive en Phase 2, dans l'ordre imposé au rôle.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, func, select

import pricing
from auth import current_user_optional
from db import get_session
from models import (
    Group,
    GroupMember,
    Merchant,
    Order,
    OrderStatus,
    PriceTier,
    Product,
    User,
    utcnow,
)
from schemas import (
    ErrorOut,
    GroupDetail,
    GroupProductOut,
    MembershipOut,
    TierOut,
)

app = FastAPI(
    title="KashFlow API",
    version="0.1.0",
    description=(
        "Achat groupé à prix dégressif. Le prix est calculé exclusivement côté "
        "serveur (décision D3) : aucun client ne recalcule un palier."
    ),
)

# L'app Expo (mobile et web) et le dashboard Vite appellent depuis d'autres origines.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    """Réponses d'erreur uniformes {detail, code}."""
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(detail), "code": f"HTTP_{exc.status_code}"},
    )


@app.get("/health", tags=["système"])
def health() -> dict[str, str]:
    return {"status": "ok"}


def build_group_detail(
    group: Group, session: Session, viewer: User | None
) -> GroupDetail:
    """Assemble le payload auto-suffisant de l'écran groupe.

    Un seul appel doit suffire à dessiner l'écran : aucun calcul côté client.
    """
    product = session.get(Product, group.product_id)
    if product is None:
        raise HTTPException(
            status_code=500,
            detail={"detail": "Produit introuvable pour ce groupe.", "code": "PRODUCT_MISSING"},
        )

    merchant = session.get(Merchant, product.merchant_id)
    tiers = session.exec(
        select(PriceTier).where(PriceTier.product_id == product.id)
    ).all()

    active_orders = session.exec(
        select(Order).where(
            Order.group_id == group.id,
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).all()
    current_quantity = sum(o.quantity for o in active_orders)

    participants_count = session.exec(
        select(func.count()).select_from(GroupMember).where(
            GroupMember.group_id == group.id
        )
    ).one()

    snap = pricing.compute(
        tiers, current_quantity, product.individual_price, group.target_quantity
    )

    membership = None
    if viewer is not None:
        mine = next((o for o in active_orders if o.user_id == viewer.id), None)
        if mine is not None:
            membership = MembershipOut(
                joined=True,
                order_id=mine.id,
                quantity=mine.quantity,
                total_amount=mine.total_amount,
            )

    deadline = group.deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=utcnow().tzinfo)
    seconds_remaining = max(int((deadline - utcnow()).total_seconds()), 0)

    return GroupDetail(
        id=group.id,
        name=group.name,
        share_code=group.share_code,
        status=group.status,
        deadline=group.deadline,
        seconds_remaining=seconds_remaining,
        product=GroupProductOut(
            id=product.id,
            name=product.name,
            unit_label=product.unit_label,
            image_url=product.image_url,
            individual_price=product.individual_price,
            merchant_name=merchant.business_name if merchant else "",
        ),
        participants_count=participants_count,
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


GROUP_RESPONSES = {404: {"model": ErrorOut, "description": "Groupe introuvable"}}


@app.get(
    "/groups/{group_id}",
    response_model=GroupDetail,
    responses=GROUP_RESPONSES,
    tags=["groupes"],
    summary="Détail d'un groupe (endpoint du polling 2s)",
)
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
    return build_group_detail(group, session, viewer)


@app.get(
    "/groups/code/{share_code}",
    response_model=GroupDetail,
    responses=GROUP_RESPONSES,
    tags=["groupes"],
    summary="Détail d'un groupe depuis un lien partagé (consultable sans compte)",
)
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
    return build_group_detail(group, session, viewer)
