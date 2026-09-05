from conftest import entete
from models import Group, GroupStatus, Order, OrderStatus, PriceTier
from sqlmodel import select

GRID = {'tiers': [{'min_quantity': 1, 'max_quantity': 99, 'unit_price': 22000}, {'min_quantity': 100, 'max_quantity': None, 'unit_price': 18000}]}

def update(client, demo):
    return client.post(f"/merchant/products/{demo['produit_id']}/tiers", headers=entete(client, demo['commercant_phone']), json=GRID)

def test_replacement_reprices_orders_and_aggregates(client, demo, session):
    assert update(client, demo).status_code == 200
    group = client.get(f"/groups/{demo['groupe_id']}").json()
    orders = session.exec(select(Order)).all()
    assert group['current_unit_price'] == 18000
    assert all(o.unit_price == 18000 and o.total_amount == 18000 * o.quantity for o in orders)
    merchant = client.get('/merchant/dashboard', headers=entete(client, demo['commercant_phone'])).json()
    assert merchant['rows'][0]['current_unit_price'] == 18000
    assert merchant['revenue_simule'] == 146 * 18000
    assert client.get('/stats/impact').json()['community_savings'] == 146 * 4000

def test_paid_order_freezes_grid_without_mutation(client, demo, session):
    order = session.exec(select(Order)).first()
    user = next(u for u in demo['acheteurs'] if u.id == order.user_id)
    assert client.post(f'/orders/{order.id}/pay', headers=entete(client, user.phone)).status_code == 200
    response = update(client, demo)
    assert response.status_code == 409
    assert response.json()['code'] == 'TIERS_FROZEN'
    assert len(session.exec(select(PriceTier)).all()) == 4
    assert client.get(f"/groups/{demo['groupe_id']}").json()['current_unit_price'] == 19000

def test_locked_group_freezes_grid(client, demo, session):
    group = session.get(Group, demo['groupe_id'])
    group.status = GroupStatus.LOCKED
    session.add(group)
    session.commit()
    assert update(client, demo).status_code == 409
    assert len(session.exec(select(PriceTier)).all()) == 4

def test_cancelled_orders_keep_their_history(client, demo, session):
    order = session.exec(select(Order)).first()
    order.order_status = OrderStatus.CANCELLED
    old_total = order.total_amount
    session.add(order)
    session.commit()
    assert update(client, demo).status_code == 200
    session.refresh(order)
    assert order.unit_price == 19000 and order.total_amount == old_total
