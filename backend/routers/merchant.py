"""Création de produits et de grilles de paliers par le commerçant."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import pricing
from auth import require_merchant
from db import get_session
from models import (
    Group,
    Merchant,
    Order,
    OrderStatus,
    PriceTier,
    Product,
    ProductStatus,
)
from schemas import (
    ErrorOut,
    MerchantProductRow,
    MerchantProductsOut,
    ProductTierOut,
    ProductCreateIn,
    ProductDetail,
    TierOut,
    TiersIn,
)
from services import product_tiers

router = APIRouter(tags=["commerçant"])

INVALID = {422: {"model": ErrorOut, "description": "Grille de paliers incohérente"}}


def _reject_invalid_tiers(tiers, stock: int) -> None:
    errors = pricing.validate_tiers(tiers, stock=stock)
    if errors:
        raise HTTPException(
            status_code=422,
            detail={"detail": " ".join(errors[:3]), "code": "INVALID_TIERS"},
        )


def _detail(product: Product, merchant: Merchant, session: Session) -> ProductDetail:
    tiers = pricing.sort_tiers(product_tiers(product.id, session))
    return ProductDetail(
        id=product.id,
        name=product.name,
        description=product.description,
        unit_label=product.unit_label,
        image_url=product.image_url,
        stock=product.stock,
        individual_price=product.individual_price,
        merchant_name=merchant.business_name,
        merchant_location=merchant.location,
        tiers=[
            ProductTierOut(
                min_quantity=t.min_quantity,
                max_quantity=t.max_quantity,
                unit_price=t.unit_price,
            )
            for t in tiers
        ],
        open_groups=[],
    )


@router.get(
    "/merchant/products",
    response_model=MerchantProductsOut,
    summary="Lister ses propres offres, brouillons compris",
)
def list_my_products(
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> MerchantProductsOut:
    """Le catalogue public masque les brouillons ; le commerçant doit les voir.

    Sans cet endpoint, un produit créé sans grille de paliers devenait
    invisible à celui-là même qui venait de le saisir.
    """
    products = session.exec(
        select(Product).where(Product.merchant_id == merchant.id).order_by(Product.id)
    ).all()
    if not products:
        return MerchantProductsOut(products=[])

    ids = [p.id for p in products]
    groups = session.exec(select(Group).where(Group.product_id.in_(ids))).all()
    orders = session.exec(
        select(Order).where(
            Order.product_id.in_(ids),
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).all()

    rows = []
    for product in products:
        tiers = pricing.sort_tiers(product_tiers(product.id, session))
        rows.append(
            MerchantProductRow(
                id=product.id,
                name=product.name,
                unit_label=product.unit_label,
                image_url=product.image_url,
                stock=product.stock,
                individual_price=product.individual_price,
                # Sans grille, le meilleur prix reste le prix de détail.
                best_price=tiers[-1].unit_price if tiers else product.individual_price,
                status=product.status,
                tiers=[
                    TierOut(min_quantity=t.min_quantity, unit_price=t.unit_price)
                    for t in tiers
                ],
                groups_count=sum(1 for g in groups if g.product_id == product.id),
                reserved_units=sum(
                    o.quantity for o in orders if o.product_id == product.id
                ),
            )
        )

    return MerchantProductsOut(products=rows)


@router.post(
    "/merchant/products",
    response_model=ProductDetail,
    status_code=201,
    responses=INVALID,
    summary="Créer un produit, avec sa grille de paliers si elle est fournie",
)
def create_product(
    payload: ProductCreateIn,
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> ProductDetail:
    tiers = payload.tiers or []
    if tiers:
        _reject_invalid_tiers(tiers, payload.stock)
        if tiers[0].min_quantity != 1:
            raise HTTPException(
                status_code=422,
                detail={
                    "detail": "Le premier palier doit commencer à 1 unité.",
                    "code": "INVALID_TIERS",
                },
            )

    product = Product(
        merchant_id=merchant.id,
        name=payload.name.strip(),
        description=payload.description,
        unit_label=payload.unit_label.strip() or "unité",
        image_url=payload.image_url,
        stock=payload.stock,
        individual_price=payload.individual_price,
        # Sans paliers, le produit reste en brouillon : il n'est pas vendable.
        status=ProductStatus.ACTIVE if tiers else ProductStatus.DRAFT,
    )
    session.add(product)
    session.flush()

    for tier in tiers:
        session.add(
            PriceTier(
                product_id=product.id,
                min_quantity=tier.min_quantity,
                max_quantity=tier.max_quantity,
                unit_price=tier.unit_price,
            )
        )

    session.commit()
    session.refresh(product)
    return _detail(product, merchant, session)


@router.post(
    "/merchant/products/{product_id}/tiers",
    response_model=list[TierOut],
    responses={**INVALID, 404: {"model": ErrorOut, "description": "Produit introuvable"}},
    summary="Remplacer la grille de paliers d'un produit",
)
def set_tiers(
    product_id: int,
    payload: TiersIn,
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> list[TierOut]:
    product = session.get(Product, product_id)
    if product is None or product.merchant_id != merchant.id:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Produit introuvable.", "code": "PRODUCT_NOT_FOUND"},
        )

    _reject_invalid_tiers(payload.tiers, product.stock)
    if payload.tiers[0].min_quantity != 1:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": "Le premier palier doit commencer à 1 unité.",
                "code": "INVALID_TIERS",
            },
        )

    for existing in session.exec(
        select(PriceTier).where(PriceTier.product_id == product.id)
    ).all():
        session.delete(existing)

    for tier in payload.tiers:
        session.add(
            PriceTier(
                product_id=product.id,
                min_quantity=tier.min_quantity,
                max_quantity=tier.max_quantity,
                unit_price=tier.unit_price,
            )
        )

    # Une grille valide rend le produit vendable.
    product.status = ProductStatus.ACTIVE
    session.add(product)
    session.commit()

    ordered = pricing.sort_tiers(product_tiers(product.id, session))
    return [TierOut(min_quantity=t.min_quantity, unit_price=t.unit_price) for t in ordered]
