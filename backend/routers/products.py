"""Catalogue public."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import pricing
from db import get_session
from models import Group, GroupStatus, Merchant, Product, ProductStatus
from schemas import ErrorOut, ProductCard, ProductDetail, ProductTierOut
from services import (
    build_group_card,
    group_quantity,
    product_tiers,
    settle_expired_groups,
)

router = APIRouter(tags=["catalogue"])


def _open_groups(product_id: int, session: Session) -> list[Group]:
    settle_expired_groups(session)
    return list(
        session.exec(
            select(Group).where(
                Group.product_id == product_id,
                Group.status == GroupStatus.OPEN,
            )
        ).all()
    )


@router.get(
    "/products",
    response_model=list[ProductCard],
    summary="Catalogue public, filtrable et triable",
)
def list_products(
    q: str | None = None,
    sort: str = "name",
    with_open_groups: bool = False,
    session: Session = Depends(get_session),
) -> list[ProductCard]:
    """Recherche et tri côté serveur.

    Le tri par prix ne peut pas se faire en SQL : le prix affiché dépend du
    groupe ouvert le moins cher, qui se calcule ligne par ligne. On trie donc
    après construction des cartes — sur trois produits c'est sans conséquence,
    et cela garde le classement cohérent avec ce qui est affiché.
    """
    requete = select(Product).where(Product.status == ProductStatus.ACTIVE)
    if q and q.strip():
        requete = requete.where(Product.name.ilike(f"%{q.strip()}%"))
    products = session.exec(requete).all()

    cards = []
    for product in products:
        tiers = product_tiers(product.id, session)
        merchant = session.get(Merchant, product.merchant_id)
        # « best_price » = le meilleur prix atteignable, ce qui donne envie de cliquer.
        best_price = min([t.unit_price for t in tiers], default=product.individual_price)

        # Le prix réellement en vigueur dans le groupe ouvert le moins cher. Sans
        # lui, le catalogue ne peut annoncer qu'une promesse : la carte produit
        # afficherait une remise que personne n'a débloquée.
        open_groups = _open_groups(product.id, session)
        open_prices = [
            pricing.compute(
                tiers,
                group_quantity(group.id, session),
                product.individual_price,
                group.target_quantity,
            ).current_unit_price
            for group in open_groups
        ]

        cards.append(
            ProductCard(
                id=product.id,
                name=product.name,
                unit_label=product.unit_label,
                image_url=product.image_url,
                individual_price=product.individual_price,
                best_price=best_price,
                merchant_name=merchant.business_name if merchant else "",
                open_groups_count=len(open_groups),
                best_open_group_price=min(open_prices) if open_prices else None,
            )
        )

    if with_open_groups:
        cards = [c for c in cards if c.open_groups_count > 0]

    def prix_affiche(carte: ProductCard) -> int:
        return carte.best_open_group_price or carte.individual_price

    if sort == "price_asc":
        cards.sort(key=prix_affiche)
    elif sort == "price_desc":
        cards.sort(key=prix_affiche, reverse=True)
    elif sort == "groups":
        cards.sort(key=lambda c: c.open_groups_count, reverse=True)
    else:
        cards.sort(key=lambda c: c.name.lower())

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
        tiers=[
            ProductTierOut(
                min_quantity=t.min_quantity,
                max_quantity=t.max_quantity,
                unit_price=t.unit_price,
            )
            for t in tiers
        ],
        open_groups=[build_group_card(g, session) for g in _open_groups(product.id, session)],
    )
