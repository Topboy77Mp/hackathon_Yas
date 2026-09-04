"""Dashboard commerçant et KPI d'impact.

`/stats/impact` porte le KPI phare du pitch : les économies générées par la
communauté. Il est public — c'est la page que le jury regarde.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from auth import require_merchant
from db import get_session
from models import (
    Group,
    GroupMember,
    GroupStatus,
    Merchant,
    Order,
    OrderStatus,
    Product,
    ProductStatus,
    User,
)
from schemas import ImpactStats, MerchantDashboard, MerchantGroupRow
from services import group_quantity, participants_count

router = APIRouter(tags=["statistiques"])


def _count(session: Session, model, *where) -> int:
    query = select(func.count()).select_from(model)
    for clause in where:
        query = query.where(clause)
    return int(session.exec(query).one())


@router.get("/stats/impact", response_model=ImpactStats)
def impact(session: Session = Depends(get_session)) -> ImpactStats:
    orders = session.exec(
        select(Order).where(Order.order_status != OrderStatus.CANCELLED)
    ).all()

    prices = {
        p.id: p.individual_price
        for p in session.exec(select(Product)).all()
    }

    units = sum(o.quantity for o in orders)
    total_value = sum(o.total_amount for o in orders)
    savings = sum(
        (prices.get(o.product_id, o.unit_price) - o.unit_price) * o.quantity
        for o in orders
    )

    groups_created = _count(session, Group)
    groups_successful = _count(session, Group, Group.status == GroupStatus.COMPLETED)

    return ImpactStats(
        users=_count(session, User),
        merchants=_count(session, Merchant),
        products=_count(session, Product, Product.status == ProductStatus.ACTIVE),
        groups_created=groups_created,
        groups_active=_count(session, Group, Group.status == GroupStatus.OPEN),
        groups_successful=groups_successful,
        success_rate=round(groups_successful / groups_created, 4) if groups_created else 0.0,
        orders=len(orders),
        units_ordered=units,
        total_order_value=total_value,
        community_savings=savings,
    )


@router.get("/merchant/dashboard", response_model=MerchantDashboard)
def merchant_dashboard(
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> MerchantDashboard:
    products = session.exec(
        select(Product).where(Product.merchant_id == merchant.id)
    ).all()
    product_ids = [p.id for p in products]
    names = {p.id: p.name for p in products}

    if not product_ids:
        return MerchantDashboard(
            business_name=merchant.business_name,
            orders=0, groups=0, units=0, revenue_simule=0, pending_orders=0, rows=[],
        )

    groups = session.exec(
        select(Group).where(Group.product_id.in_(product_ids))
    ).all()
    orders = session.exec(
        select(Order).where(
            Order.product_id.in_(product_ids),
            Order.order_status != OrderStatus.CANCELLED,
        )
    ).all()

    rows = []
    for group in groups:
        group_orders = [o for o in orders if o.group_id == group.id]
        rows.append(
            MerchantGroupRow(
                group_id=group.id,
                group_name=group.name,
                product_name=names.get(group.product_id, ""),
                participants_count=participants_count(group.id, session),
                current_quantity=group_quantity(group.id, session),
                target_quantity=group.target_quantity,
                current_unit_price=group_orders[0].unit_price if group_orders else 0,
                total_amount=sum(o.total_amount for o in group_orders),
                status=group.status,
            )
        )

    return MerchantDashboard(
        business_name=merchant.business_name,
        orders=len(orders),
        groups=len(groups),
        units=sum(o.quantity for o in orders),
        revenue_simule=sum(o.total_amount for o in orders),
        pending_orders=sum(1 for o in orders if o.order_status == OrderStatus.PENDING),
        rows=rows,
    )
