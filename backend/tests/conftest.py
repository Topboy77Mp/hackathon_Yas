"""Socle des tests d'intégration.

Base SQLite dédiée, créée et détruite pour chaque test. La base PostgreSQL de
démonstration n'est jamais touchée : lancer les tests la veille du pitch ne doit
pas pouvoir effacer le jeu de données.

Limite assumée : SQLite ignore `SELECT ... FOR UPDATE`. Le verrou de ligne n'est
donc pas couvert ici — il a été validé à la main sur PostgreSQL avec 20 joins
simultanés. Le contrat borne la Phase 3 à `pricing.py` et au parcours de démo.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import db
from auth import hash_password
from main import app
from models import (
    Group,
    GroupMember,
    GroupStatus,
    Merchant,
    Order,
    PriceTier,
    Product,
    ProductStatus,
    User,
    UserRole,
    utcnow,
)

MOT_DE_PASSE = "demo1234"

# bcrypt coûte ~250 ms par hachage. La fixture crée 39 comptes ; les hacher un
# par un à chaque test ajoutait une dizaine de secondes par test. On hache une
# seule fois au chargement du module et on réutilise l'empreinte : la
# vérification fonctionne à l'identique, la suite passe de plusieurs minutes à
# quelques secondes.
EMPREINTE = hash_password(MOT_DE_PASSE)

# Jeu de démonstration du contrat, en réduction : engrais NPK, mêmes paliers,
# mêmes prix. Le groupe démarre à 146 sacs comme en production.
PALIERS = [(1, 49, 22000), (50, 99, 20500), (100, 199, 19000), (200, None, 17500)]


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    app.dependency_overrides[db.get_session] = lambda: session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="demo")
def demo_fixture(session: Session) -> dict:
    """Reproduit l'état de départ de la démonstration : 38 participants, 146 sacs."""
    commercant = User(
        first_name="Zio", last_name="Agro", phone="+22890000001",
        password_hash=EMPREINTE, role=UserRole.MERCHANT,
    )
    session.add(commercant)
    session.flush()

    boutique = Merchant(
        user_id=commercant.id, business_name="Agro-Intrants Zio", location="Tsévié"
    )
    session.add(boutique)
    session.flush()

    produit = Product(
        merchant_id=boutique.id, name="Engrais NPK 15-15-15", unit_label="sac",
        stock=600, individual_price=22000, status=ProductStatus.ACTIVE,
    )
    session.add(produit)
    session.flush()

    for minimum, maximum, prix in PALIERS:
        session.add(
            PriceTier(product_id=produit.id, min_quantity=minimum,
                      max_quantity=maximum, unit_price=prix)
        )

    groupe = Group(
        creator_id=commercant.id, product_id=produit.id, name="Producteurs de Kovié",
        target_quantity=200, min_quantity=100,
        deadline=utcnow() + timedelta(hours=48),
        status=GroupStatus.OPEN, share_code="KOVIE",
    )
    session.add(groupe)
    session.flush()

    # 38 participants pour 146 sacs, au prix du palier en vigueur.
    quantites = [4] * 32 + [3] * 6
    assert sum(quantites) == 146
    acheteurs = []
    for index, quantite in enumerate(quantites):
        acheteur = User(
            first_name=f"Acheteur{index}", last_name="Test",
            phone=f"+22891{index + 1:06d}", password_hash=EMPREINTE,
        )
        session.add(acheteur)
        session.flush()
        acheteurs.append(acheteur)
        session.add(GroupMember(group_id=groupe.id, user_id=acheteur.id))
        session.add(
            Order(user_id=acheteur.id, group_id=groupe.id, product_id=produit.id,
                  quantity=quantite, unit_price=19000, total_amount=19000 * quantite)
        )

    session.commit()
    return {
        "groupe_id": groupe.id, "produit_id": produit.id,
        "commercant_phone": commercant.phone, "acheteurs": acheteurs,
    }


def jeton(client: TestClient, phone: str) -> str:
    reponse = client.post("/auth/login", json={"phone": phone, "password": MOT_DE_PASSE})
    assert reponse.status_code == 200, reponse.text
    return reponse.json()["token"]


def entete(client: TestClient, phone: str) -> dict:
    return {"Authorization": f"Bearer {jeton(client, phone)}"}
