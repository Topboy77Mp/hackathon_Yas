"""Reproduction sur SQLite isolée : changement de paliers avec commandes actives.
Depuis la racine : backend/.venv313/Scripts/python.exe dashboard/tests/backend_pricing_probe.py
Sortie 1 tant que le backend ne recalcule pas les commandes ou ne refuse pas la mutation.
"""
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[2] / 'backend'
sys.path.insert(0, str(backend))
sys.path.insert(0, str(backend / 'tests'))
from conftest import session_fixture, client_fixture, demo_fixture, entete
from models import Order
from sqlmodel import select

session_scope = session_fixture.__wrapped__()
session = next(session_scope)
client_scope = client_fixture.__wrapped__(session)
client = next(client_scope)
try:
    demo = demo_fixture.__wrapped__(session)
    headers = entete(client, demo['commercant_phone'])
    response = client.post(
        f"/merchant/products/{demo['produit_id']}/tiers", headers=headers,
        json={'tiers': [
            {'min_quantity': 1, 'max_quantity': 99, 'unit_price': 22000},
            {'min_quantity': 100, 'max_quantity': None, 'unit_price': 18000},
        ]},
    )
    group = client.get(f"/groups/{demo['groupe_id']}").json()
    merchant = client.get('/merchant/dashboard', headers=headers).json()
    orders = session.exec(select(Order)).all()
    print({
        'http': response.status_code,
        'prix_groupe': group['current_unit_price'],
        'prix_commandes': sorted({o.unit_price for o in orders}),
        'prix_tableau_commercant': merchant['rows'][0]['current_unit_price'],
    })
    assert response.status_code in (200, 409, 422), response.text
    assert all(o.unit_price == group['current_unit_price'] for o in orders), (
        'INCOHERENCE : le groupe et les commandes actives ne partagent plus le même prix.'
    )
    assert merchant['rows'][0]['current_unit_price'] == group['current_unit_price']
finally:
    client_scope.close()
    session_scope.close()
