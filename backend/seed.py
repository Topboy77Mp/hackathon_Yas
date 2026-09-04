"""Jeu de données de démonstration.

    python seed.py --reset     # vide la base, recrée le schéma, réinjecte la démo

Reproduit exactement l'état décrit au contrat : groupe « Producteurs de Kovié »,
38 participants, 146 sacs, prix courant 19 000 F, il manque 54 sacs pour 17 500 F.
"""

from __future__ import annotations

import argparse
from datetime import timedelta

from passlib.context import CryptContext
from sqlmodel import Session, select

import pricing
from db import create_all, drop_all, engine
from models import (
    Group,
    GroupMember,
    GroupStatus,
    Merchant,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    PriceTier,
    Product,
    ProductStatus,
    User,
    UserRole,
    utcnow,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PASSWORD = "demo1234"
SHARE_CODE = "KOVIE"

PARTICIPANTS = 38
TOTAL_QUANTITY = 146

PRENOMS = [
    "Kodjo", "Afi", "Yao", "Akossiwa", "Kossi", "Amivi", "Komlan", "Ayélé",
    "Sena", "Essi", "Mawuli", "Adjoa", "Kofi", "Abra", "Edem", "Dzifa",
    "Koffi", "Enyonam", "Selom", "Akua", "Kwami", "Yawa", "Elom", "Sitsofe",
    "Mensah", "Adjovi", "Tete", "Afiwa", "Kodzo", "Ablavi", "Senyo", "Akpene",
    "Fofo", "Mawuena", "Kokou", "Adzo", "Nyuiadzi", "Lolo",
]
NOMS = [
    "Agbeko", "Amegan", "Bawa", "Dogbe", "Fiawoo", "Gbedemah", "Hounkpati",
    "Johnson", "Kpodar", "Lawson", "Mensah", "Nyavor", "Ovono", "Pekemsi",
    "Quashie", "Sossou", "Tamakloe", "Ubaldo", "Vodouhe", "Wilson",
]


def quantites(participants: int, total: int) -> list[int]:
    """Répartition déterministe de `total` sacs sur `participants` commandes."""
    cycle = [2, 3, 4, 5, 6]
    q = [cycle[i % len(cycle)] for i in range(participants)]
    q[-1] += total - sum(q)
    if q[-1] < 1:
        raise ValueError("Répartition impossible : total trop faible.")
    return q


def seed(session: Session) -> None:
    hash_demo = pwd_context.hash(DEMO_PASSWORD)

    commercant = User(
        first_name="Komi",
        last_name="Adjalla",
        phone="+22890000001",
        email="agro.zio@kashflow.demo",
        password_hash=hash_demo,
        role=UserRole.MERCHANT,
    )
    session.add(commercant)
    session.commit()
    session.refresh(commercant)

    boutique = Merchant(
        user_id=commercant.id,
        business_name="Agro-Intrants Zio",
        description="Engrais, semences et intrants agricoles pour les producteurs de la région Maritime.",
        location="Tsévié",
    )
    session.add(boutique)
    session.commit()
    session.refresh(boutique)

    catalogue = [
        (
            Product(
                merchant_id=boutique.id,
                name="Engrais NPK 15-15-15",
                description="Sac de 50 kg. Engrais complet pour maïs, riz et maraîchage.",
                unit_label="sac",
                stock=600,
                individual_price=22_000,
                status=ProductStatus.ACTIVE,
            ),
            [(1, 49, 22_000), (50, 99, 20_500), (100, 199, 19_000), (200, None, 17_500)],
        ),
        (
            Product(
                merchant_id=boutique.id,
                name="Semences de maïs améliorées",
                description="Sac de 25 kg. Variété à cycle court, adaptée à la saison des pluies.",
                unit_label="sac",
                stock=400,
                individual_price=15_000,
                status=ProductStatus.ACTIVE,
            ),
            [(1, 49, 15_000), (50, 99, 14_000), (100, 199, 13_000), (200, None, 12_000)],
        ),
        (
            Product(
                merchant_id=boutique.id,
                name="Kit scolaire complet",
                description="Cahiers, stylos, ardoise et cartable pour une année scolaire.",
                unit_label="kit",
                stock=500,
                individual_price=12_500,
                status=ProductStatus.ACTIVE,
            ),
            [(1, 29, 12_500), (30, 79, 11_500), (80, 149, 10_500), (150, None, 9_500)],
        ),
    ]

    produits = []
    for produit, paliers in catalogue:
        session.add(produit)
        session.commit()
        session.refresh(produit)
        tiers = [
            PriceTier(
                product_id=produit.id,
                min_quantity=mn,
                max_quantity=mx,
                unit_price=prix,
            )
            for mn, mx, prix in paliers
        ]
        erreurs = pricing.validate_tiers(tiers, stock=produit.stock)
        if erreurs:
            raise ValueError(f"Paliers invalides pour {produit.name} : {erreurs}")
        session.add_all(tiers)
        produits.append(produit)
    session.commit()

    engrais = produits[0]
    tiers_engrais = session.exec(
        select(PriceTier).where(PriceTier.product_id == engrais.id)
    ).all()

    quantites_membres = quantites(PARTICIPANTS, TOTAL_QUANTITY)
    prix_courant = pricing.current_tier(tiers_engrais, TOTAL_QUANTITY).unit_price

    acheteurs = []
    for i in range(PARTICIPANTS):
        acheteurs.append(
            User(
                first_name=PRENOMS[i % len(PRENOMS)],
                last_name=NOMS[i % len(NOMS)],
                phone=f"+2289{i + 1:07d}",
                password_hash=hash_demo,
                role=UserRole.USER,
            )
        )
    session.add_all(acheteurs)
    session.commit()
    for a in acheteurs:
        session.refresh(a)

    groupe = Group(
        creator_id=acheteurs[0].id,
        product_id=engrais.id,
        name="Producteurs de Kovié",
        target_quantity=200,
        min_quantity=100,
        deadline=utcnow() + timedelta(days=2),
        status=GroupStatus.OPEN,
        share_code=SHARE_CODE,
    )
    session.add(groupe)
    session.commit()
    session.refresh(groupe)

    # Les 20 premiers ont déjà payé : la démo montre les deux états de commande.
    for rang, (acheteur, quantite) in enumerate(zip(acheteurs, quantites_membres)):
        session.add(GroupMember(group_id=groupe.id, user_id=acheteur.id))
        paye = rang < 20
        commande = Order(
            user_id=acheteur.id,
            group_id=groupe.id,
            product_id=engrais.id,
            quantity=quantite,
            unit_price=prix_courant,
            total_amount=prix_courant * quantite,
            payment_status=PaymentStatus.SUCCESS if paye else PaymentStatus.PENDING,
            order_status=OrderStatus.CONFIRMED if paye else OrderStatus.PENDING,
        )
        session.add(commande)
        session.commit()
        session.refresh(commande)
        if paye:
            session.add(
                Payment(
                    order_id=commande.id,
                    amount=commande.total_amount,
                    method="MOCK",
                    status=PaymentStatus.SUCCESS,
                    transaction_reference=f"KF-DEMO-{commande.id:05d}",
                )
            )
    session.commit()

    snapshot = pricing.compute(
        tiers_engrais, TOTAL_QUANTITY, engrais.individual_price, groupe.target_quantity
    )
    print(f"Commerçant     : {boutique.business_name} ({boutique.location})")
    print(f"Produits       : {len(produits)}")
    print(f"Groupe         : {groupe.name} · code {groupe.share_code}")
    print(f"Participants   : {PARTICIPANTS}")
    print(f"Quantité       : {sum(quantites_membres)} {engrais.unit_label}s")
    print(f"Prix courant   : {snapshot.current_unit_price} FCFA")
    print(f"Prochain palier: {snapshot.next_tier.unit_price} FCFA "
          f"dans {snapshot.quantity_to_next_tier} {engrais.unit_label}s")
    print(f"Économie groupe: {snapshot.group_total_saving} FCFA")
    print(f"Connexion démo : {acheteurs[0].phone} / {DEMO_PASSWORD}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed de démonstration KashFlow")
    parser.add_argument(
        "--reset", action="store_true", help="vide la base avant de réinjecter"
    )
    args = parser.parse_args()

    if args.reset:
        drop_all()
    create_all()

    with Session(engine) as session:
        if session.exec(select(User)).first() and not args.reset:
            print("Base déjà peuplée. Relancer avec --reset pour rejouer la démo.")
            return
        seed(session)


if __name__ == "__main__":
    main()
