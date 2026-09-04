"""Catalogue public."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import pricing
from db import get_session
from models import Group, GroupStatus, Merchant, Product, ProductStatus
from schemas import ErrorOut, ProductCard, ProductDetail, TierOut
from services import build_group_card, product_tiers

router = APIRouter(tags=["catalogue"])


def _open_groups(product_id: int, session: Session) -> list[Group]:
    return list(
        session.exec(
            select(Group).where(
                Group.product_id == product_id,
                Group.status == GroupStatus.OPEN,
            )
        ).all()
    )


@router.get("/products", response_model=list[ProductCard])
def list_products(session: Session = Depends(get_session)) -> list[ProductCard]:
    products = session.exec(
        select(Product).where(Product.status == ProductStatus.ACTIVE)
    ).all()

    cards = []
    for product in products:
        tiers = product_tiers(product.id, session)
        merchant = session.get(Merchant, product.merchant_id)
        # « best_price » = le meilleur prix atteignable, ce qui donne envie de cliquer.
        best_price = min([t.unit_price for t in tiers], default=product.individual_price)
        cards.append(
            ProductCard(
                id=product.id,
                name=product.name,
                unit_label=product.unit_label,
                image_url=product.image_url,
                individual_price=product.individual_price,
                best_price=best_price,
                merchant_name=merchant.business_name if merchant else "",
                open_groups_count=len(_open_groups(product.id, session)),
            )
        )
    return cards


@router.get(
    "/products/{product_id}",
    response_model=ProductDetail,
    responses={404: {"model": ErrorOut, "description": "Produit introuvable"}},
)
def get_product(
    product_id: int, session: Session = Depends(get_session)
) -> ProductDetail:
    product = session.get(Product, product_id)
    if product is None or product.status != ProductStatus.ACTIVE:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Produit introuvable.", "code": "PRODUCT_NOT_FOUND"},
        )

    merchant = session.get(Merchant, product.merchant_id)
    tiers = pricing.sort_tiers(product_tiers(product.id, session))

    return ProductDetail(
        id=product.id,
        name=product.name,
        description=product.description,
        unit_label=product.unit_label,
        image_url=product.image_url,
        stock=product.stock,
        individual_price=product.individual_price,
        merchant_name=merchant.business_name if merchant else "",
        merchant_location=merchant.location if merchant else None,
        tiers=[TierOut(min_quantity=t.min_quantity, unit_price=t.unit_price) for t in tiers],
        open_groups=[build_group_card(g, session) for g in _open_groups(product.id, session)],
    )
