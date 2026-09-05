"""Jeu de démonstration étendu — une application qui a l'air vécue.

À lancer **après** `seed.py --reset`. Le groupe « Producteurs de Kovié » reste
intact à 146/200 sacs : c'est la cible chiffrée du contrat et le moment fort de
la démonstration. Tout le reste vient s'ajouter autour.

On y trouve : cinq commerçants, quinze produits, des groupes à tous les stades
— en cours, réussis, livrés, annulés —, des commandes payées et en attente, et
des notifications déjà reçues. Un catalogue à trois produits et un seul groupe
donne l'impression d'une maquette ; c'est ce que ce script corrige.
"""
from __future__ import annotations

import random
import sys
from datetime import timedelta

from passlib.context import CryptContext
from sqlmodel import Session, select

from db import engine
from models import (
    Group, GroupMember, GroupStatus, Merchant, Notification, Order, OrderStatus,
    Payment, PaymentStatus, PriceTier, Product, ProductStatus, User, UserRole, utcnow,
)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
MDP = "demo1234"

# Graine fixe : la démonstration doit être identique à chaque exécution. Un jeu
# qui change entre deux répétitions rend les chiffres du pitch impossibles à
# apprendre.
random.seed(20260905)

PRENOMS = ["Kodjo", "Afi", "Yao", "Akossiwa", "Kossi", "Amivi", "Komlan", "Ayélé",
           "Sena", "Essi", "Mawuli", "Adjoa", "Kofi", "Abra", "Edem", "Dzifa",
           "Enyonam", "Selom", "Akua", "Kwami", "Yawa", "Elom", "Sitsofe", "Adjovi",
           "Tete", "Afiwa", "Kodzo", "Ablavi", "Senyo", "Akpene", "Mawuena", "Adzo"]
NOMS = ["Agbeko", "Amegan", "Bawa", "Dogbe", "Fiawoo", "Gbedemah", "Hounkpati",
        "Johnson", "Kpodar", "Lawson", "Mensah", "Nyavor", "Sossou", "Tamakloe",
        "Vodouhe", "Wilson", "Ayivi", "Dossou", "Kougblenou", "Attiogbe"]

# (boutique, lieu, description, téléphone du gérant, prénom, nom)
COMMERCANTS = [
    ("Coopérative Avenir Kara", "Kara",
     "Céréales, légumineuses et intrants pour les producteurs de la Kara.",
     "+22890000002", "Aïcha", "Boukari"),
    ("Grossiste Lomé Central", "Lomé",
     "Riz, huile et produits de première nécessité, en gros et demi-gros.",
     "+22890000003", "Séna", "Amoussou"),
    ("BTP Matériaux Togo", "Lomé",
     "Ciment, fer à béton et matériaux de construction.",
     "+22890000004", "Edem", "Kpogo"),
    ("Éducation Plus Sokodé", "Sokodé",
     "Fournitures scolaires et manuels, tarifs de groupe pour les écoles.",
     "+22890000005", "Fatima", "Tchalla"),
]

# (boutique, nom, unité, stock, prix détail, paliers [(min, max, prix)])
PRODUITS = [
    ("Coopérative Avenir Kara", "Riz local Kara 25 kg", "sac", 500, 16000,
     [(1, 39, 16000), (40, 99, 14800), (100, 199, 13500), (200, None, 12000)]),
    ("Coopérative Avenir Kara", "Soja certifié 50 kg", "sac", 300, 24000,
     [(1, 29, 24000), (30, 79, 22000), (80, None, 19500)]),
    ("Coopérative Avenir Kara", "Arachide décortiquée 25 kg", "sac", 260, 18500,
     [(1, 24, 18500), (25, 74, 17000), (75, None, 15200)]),
    ("Grossiste Lomé Central", "Huile végétale 20 L", "bidon", 400, 22500,
     [(1, 19, 22500), (20, 59, 21000), (60, 149, 19500), (150, None, 17800)]),
    ("Grossiste Lomé Central", "Riz parfumé importé 50 kg", "sac", 600, 28000,
     [(1, 29, 28000), (30, 99, 26000), (100, None, 23500)]),
    ("Grossiste Lomé Central", "Sucre en poudre 50 kg", "sac", 350, 32000,
     [(1, 19, 32000), (20, 69, 30000), (70, None, 27500)]),
    ("Grossiste Lomé Central", "Savon de ménage (carton de 40)", "carton", 500, 9500,
     [(1, 49, 9500), (50, 149, 8700), (150, None, 7800)]),
    ("BTP Matériaux Togo", "Ciment CPJ 35 — 50 kg", "sac", 2000, 4800,
     [(1, 99, 4800), (100, 299, 4500), (300, 799, 4200), (800, None, 3900)]),
    ("BTP Matériaux Togo", "Fer à béton 12 mm (barre 12 m)", "barre", 800, 7200,
     [(1, 49, 7200), (50, 199, 6700), (200, None, 6100)]),
    ("BTP Matériaux Togo", "Tôle bac alu 3 m", "tôle", 600, 11500,
     [(1, 39, 11500), (40, 119, 10600), (120, None, 9700)]),
    ("Éducation Plus Sokodé", "Cahier 200 pages (paquet de 10)", "paquet", 900, 4500,
     [(1, 49, 4500), (50, 149, 4100), (150, None, 3600)]),
    ("Éducation Plus Sokodé", "Manuel de mathématiques CM2", "manuel", 700, 3800,
     [(1, 39, 3800), (40, 129, 3400), (130, None, 3000)]),
]

# (produit, nom du groupe, code, objectif, minimum, statut, avancement 0..1, heures avant échéance)
GROUPES = [
    ("Ciment CPJ 35 — 50 kg", "Chantier école de Bè", "CIMBE", 800, 300, GroupStatus.OPEN, 0.93, 9),
    ("Riz local Kara 25 kg", "Cantine scolaire de Kara", "RIZKA", 200, 100, GroupStatus.OPEN, 0.71, 30),
    ("Huile végétale 20 L", "Restauratrices de Hédzranawoé", "HUILE", 150, 60, GroupStatus.OPEN, 0.55, 44),
    ("Cahier 200 pages (paquet de 10)", "Rentrée 2026 — Sokodé", "CAHIE", 150, 80, GroupStatus.OPEN, 0.34, 60),
    ("Fer à béton 12 mm (barre 12 m)", "Maçons de Baguida", "FERBA", 200, 80, GroupStatus.OPEN, 0.18, 66),
    ("Soja certifié 50 kg", "Éleveurs de la Kozah", "SOJAK", 80, 40, GroupStatus.OPEN, 0.62, 20),
    ("Riz parfumé importé 50 kg", "Grossistes du marché d'Adawlato", "RIZAD", 100, 50, GroupStatus.LOCKED, 1.0, -6),
    ("Savon de ménage (carton de 40)", "Détaillantes de Kodjoviakopé", "SAVON", 150, 70, GroupStatus.LOCKED, 1.0, -14),
    ("Tôle bac alu 3 m", "Toitures de Tsévié", "TOLES", 120, 50, GroupStatus.COMPLETED, 1.0, -72),
    ("Manuel de mathématiques CM2", "Écoles primaires de Notsé", "MANUE", 130, 60, GroupStatus.COMPLETED, 1.0, -96),
    ("Sucre en poudre 50 kg", "Pâtissières de Lomé", "SUCRE", 70, 45, GroupStatus.CANCELLED, 0.42, -20),
    ("Arachide décortiquée 25 kg", "Transformatrices d'Aného", "ARACH", 75, 40, GroupStatus.CANCELLED, 0.33, -48),
]


def prix_au_palier(paliers, quantite: int) -> int:
    """Même règle que pricing.current_tier : le dernier palier atteint gagne."""
    prix = paliers[0][2]
    for mini, _maxi, p in paliers:
        if quantite >= mini:
            prix = p
    return prix


def enrichir(session: Session) -> dict:
    empreinte = pwd.hash(MDP)
    stats = {"commercants": 0, "produits": 0, "groupes": 0, "acheteurs": 0,
             "commandes": 0, "paiements": 0, "notifications": 0}

    # ── Commerçants ────────────────────────────────────────────────
    boutiques: dict[str, Merchant] = {}
    for nom_boutique, lieu, description, tel, prenom, nom in COMMERCANTS:
        if session.exec(select(User).where(User.phone == tel)).first():
            continue
        gerant = User(first_name=prenom, last_name=nom, phone=tel,
                      email=f"{nom_boutique.split()[0].lower()}@kashflow.demo",
                      password_hash=empreinte, role=UserRole.MERCHANT)
        session.add(gerant)
        session.flush()
        boutique = Merchant(user_id=gerant.id, business_name=nom_boutique,
                            location=lieu, description=description)
        session.add(boutique)
        session.flush()
        boutiques[nom_boutique] = boutique
        stats["commercants"] += 1

    # ── Produits et grilles ────────────────────────────────────────
    produits: dict[str, Product] = {}
    for nom_boutique, nom, unite, stock, detail, paliers in PRODUITS:
        boutique = boutiques.get(nom_boutique)
        if boutique is None:
            continue
        produit = Product(merchant_id=boutique.id, name=nom, unit_label=unite,
                          stock=stock, individual_price=detail,
                          status=ProductStatus.ACTIVE,
                          description=f"Vendu par {nom_boutique}. Prix dégressif selon le volume du groupe.")
        session.add(produit)
        session.flush()
        for mini, maxi, prix in paliers:
            session.add(PriceTier(product_id=produit.id, min_quantity=mini,
                                  max_quantity=maxi, unit_price=prix))
        produits[nom] = produit
        stats["produits"] += 1

    session.commit()

    # ── Acheteurs ──────────────────────────────────────────────────
    depart = int(session.exec(select(User).where(User.phone.like("+22892%"))).first() is not None)
    acheteurs: list[User] = []
    for i in range(120):
        acheteur = User(
            first_name=PRENOMS[i % len(PRENOMS)],
            last_name=NOMS[(i * 7) % len(NOMS)],
            phone=f"+22892{i + 1:06d}",
            password_hash=empreinte,
            role=UserRole.USER,
        )
        session.add(acheteur)
        acheteurs.append(acheteur)
        stats["acheteurs"] += 1
    session.commit()
    for a in acheteurs:
        session.refresh(a)

    # ── Groupes, commandes, paiements ──────────────────────────────
    curseur = 0
    paliers_par_produit = {n: p for _, n, _, _, _, p in PRODUITS}

    for nom_produit, nom_groupe, code, objectif, minimum, statut, avancement, heures in GROUPES:
        produit = produits.get(nom_produit)
        if produit is None:
            continue

        quantite_totale = max(int(objectif * avancement), 1)
        paliers = paliers_par_produit[nom_produit]
        prix = prix_au_palier(paliers, quantite_totale)

        createur = acheteurs[curseur % len(acheteurs)]
        groupe = Group(
            creator_id=createur.id, product_id=produit.id, name=nom_groupe,
            target_quantity=objectif, min_quantity=minimum,
            deadline=utcnow() + timedelta(hours=heures),
            status=statut, share_code=code,
            created_at=utcnow() - timedelta(hours=abs(heures) + 24),
        )
        session.add(groupe)
        session.flush()
        stats["groupes"] += 1

        # Répartition du volume sur un nombre plausible de participants.
        nb = max(3, min(len(acheteurs) - 1, quantite_totale // 3))
        parts = [quantite_totale // nb] * nb
        for i in range(quantite_totale - sum(parts)):
            parts[i % nb] += 1

        annule = statut == GroupStatus.CANCELLED
        for part in parts:
            membre = acheteurs[curseur % len(acheteurs)]
            curseur += 1
            session.add(GroupMember(group_id=groupe.id, user_id=membre.id))

            if annule:
                etat, paiement = OrderStatus.CANCELLED, PaymentStatus.REFUNDED
            elif statut in (GroupStatus.LOCKED, GroupStatus.COMPLETED):
                etat, paiement = OrderStatus.CONFIRMED, PaymentStatus.SUCCESS
            else:
                etat, paiement = OrderStatus.PENDING, PaymentStatus.PENDING

            commande = Order(
                user_id=membre.id, group_id=groupe.id, product_id=produit.id,
                quantity=part, unit_price=prix, total_amount=prix * part,
                order_status=etat, payment_status=paiement,
                created_at=groupe.created_at + timedelta(minutes=random.randint(5, 900)),
            )
            session.add(commande)
            session.flush()
            stats["commandes"] += 1

            if paiement in (PaymentStatus.SUCCESS, PaymentStatus.REFUNDED):
                reglement = Payment(order_id=commande.id, amount=commande.total_amount,
                                    method="MOCK", status=paiement)
                session.add(reglement)
                session.flush()
                reglement.transaction_reference = f"KF-{reglement.id:06d}"
                stats["paiements"] += 1

        # Notifications : franchissement pour les groupes qui ont abouti,
        # annulation pour les autres. Elles existent déjà en base pour de vrai.
        for membre_id in {a.user_id for a in session.exec(
            select(GroupMember).where(GroupMember.group_id == groupe.id)
        ).all()}:
            if statut in (GroupStatus.LOCKED, GroupStatus.COMPLETED):
                session.add(Notification(
                    user_id=membre_id, type="TIER_UNLOCKED",
                    title="Palier débloqué",
                    message=f"« {nom_groupe} » a atteint son objectif. Prix final : {prix} FCFA.",
                    read=random.random() < 0.6,
                ))
                stats["notifications"] += 1
            elif annule:
                session.add(Notification(
                    user_id=membre_id, type="GROUP_CANCELLED",
                    title="Groupe annulé",
                    message=f"« {nom_groupe} » n'a pas atteint son minimum. Aucun débit n'a été effectué.",
                    read=random.random() < 0.3,
                ))
                stats["notifications"] += 1

    session.commit()
    return stats


if __name__ == "__main__":
    with Session(engine) as session:
        if session.exec(select(Group).where(Group.share_code == "KOVIE")).first() is None:
            print("Lancez d'abord : python seed.py --reset", file=sys.stderr)
            raise SystemExit(1)

        stats = enrichir(session)

        print("Jeu de démonstration étendu")
        for cle, valeur in stats.items():
            print(f"  {cle:<14} : +{valeur}")

        ouverts = session.exec(select(Group).where(Group.status == GroupStatus.OPEN)).all()
        kovie = session.exec(select(Group).where(Group.share_code == "KOVIE")).first()
        print(f"\n  groupes ouverts au total : {len(ouverts)}")
        print(f"  KOVIE intact             : {kovie.status.value}, objectif {kovie.target_quantity}")
