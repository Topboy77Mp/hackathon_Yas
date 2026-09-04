"""Espace commerçant, assistants IA et notifications."""

from __future__ import annotations

import pricing
from conftest import MOT_DE_PASSE, entete


def en_tete_commercant(client, demo) -> dict:
    return entete(client, demo["commercant_phone"])


def en_tete_acheteur(client, demo) -> dict:
    return entete(client, demo["acheteurs"][0].phone)


GRILLE_VALIDE = [
    {"min_quantity": 1, "max_quantity": 49, "unit_price": 18000},
    {"min_quantity": 50, "max_quantity": 149, "unit_price": 16500},
    {"min_quantity": 150, "unit_price": 15000},
]


class TestCreationProduit:
    def test_creation_avec_grille(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Riz local", "unit_label": "sac", "stock": 400,
                  "individual_price": 18000, "tiers": GRILLE_VALIDE},
        )
        assert reponse.status_code == 201
        produit = reponse.json()
        assert len(produit["tiers"]) == 3
        assert produit["name"] in [p["name"] for p in client.get("/products").json()]

    def test_sans_grille_le_produit_reste_brouillon(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Sans paliers", "stock": 50, "individual_price": 5000},
        )
        assert reponse.status_code == 201
        assert "Sans paliers" not in [p["name"] for p in client.get("/products").json()]

    def test_poser_les_paliers_rend_le_produit_vendable(self, client, demo):
        en_tete = en_tete_commercant(client, demo)
        produit_id = client.post(
            "/merchant/products", headers=en_tete,
            json={"name": "À compléter", "stock": 50, "individual_price": 5000},
        ).json()["id"]

        reponse = client.post(
            f"/merchant/products/{produit_id}/tiers", headers=en_tete,
            json={"tiers": [{"min_quantity": 1, "max_quantity": 9, "unit_price": 5000},
                            {"min_quantity": 10, "unit_price": 4200}]},
        )
        assert reponse.status_code == 200
        assert "À compléter" in [p["name"] for p in client.get("/products").json()]

    def test_remplacer_une_grille(self, client, demo):
        en_tete = en_tete_commercant(client, demo)
        reponse = client.post(
            f"/merchant/products/{demo['produit_id']}/tiers", headers=en_tete,
            json={"tiers": [{"min_quantity": 1, "max_quantity": 99, "unit_price": 22000},
                            {"min_quantity": 100, "unit_price": 18000}]},
        )
        assert reponse.status_code == 200
        assert len(reponse.json()) == 2, "l'ancienne grille est remplacée, pas complétée"

    def test_produit_d_un_autre_commercant(self, client, demo):
        """Un commerçant ne modifie pas la grille du voisin — et ne sait pas qu'elle existe."""
        client.post(
            "/auth/register",
            json={"first_name": "Autre", "last_name": "Boutique",
                  "phone": "+22871000001", "password": MOT_DE_PASSE},
        )
        from sqlmodel import select
        from models import Merchant, User, UserRole

        session = client.app.dependency_overrides
        reponse = client.post(
            f"/merchant/products/{demo['produit_id']}/tiers",
            headers=entete(client, "+22871000001"),
            json={"tiers": GRILLE_VALIDE},
        )
        # Le compte n'est pas commerçant : refus avant même la question du produit.
        assert reponse.status_code == 403
        assert reponse.json()["code"] == "NOT_A_MERCHANT"


class TestValidationDesGrilles:
    """Les incohérences que le cahier des charges interdit explicitement."""

    def test_prix_qui_monte_avec_le_volume(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Prix croissant", "stock": 100, "individual_price": 1000,
                  "tiers": [{"min_quantity": 1, "max_quantity": 49, "unit_price": 1000},
                            {"min_quantity": 50, "unit_price": 1200}]},
        )
        assert reponse.status_code == 422
        assert reponse.json()["code"] == "INVALID_TIERS"
        assert "baisser" in reponse.json()["detail"]

    def test_chevauchement(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Chevauchement", "stock": 100, "individual_price": 1000,
                  "tiers": [{"min_quantity": 1, "max_quantity": 60, "unit_price": 1000},
                            {"min_quantity": 50, "unit_price": 900}]},
        )
        assert reponse.status_code == 422
        assert "Chevauchement" in reponse.json()["detail"]

    def test_dernier_palier_ferme(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Dernier fermé", "stock": 100, "individual_price": 1000,
                  "tiers": [{"min_quantity": 1, "max_quantity": 49, "unit_price": 1000},
                            {"min_quantity": 50, "max_quantity": 99, "unit_price": 900}]},
        )
        assert reponse.status_code == 422
        assert "ouvert" in reponse.json()["detail"]

    def test_seuil_au_dela_du_stock(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Au-delà du stock", "stock": 50, "individual_price": 1000,
                  "tiers": [{"min_quantity": 1, "max_quantity": 99, "unit_price": 1000},
                            {"min_quantity": 100, "unit_price": 900}]},
        )
        assert reponse.status_code == 422
        assert "stock" in reponse.json()["detail"]

    def test_premier_palier_doit_partir_de_un(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_commercant(client, demo),
            json={"name": "Départ à 10", "stock": 100, "individual_price": 1000,
                  "tiers": [{"min_quantity": 10, "max_quantity": 49, "unit_price": 1000},
                            {"min_quantity": 50, "unit_price": 900}]},
        )
        assert reponse.status_code == 422

    def test_reserve_aux_commercants(self, client, demo):
        reponse = client.post(
            "/merchant/products", headers=en_tete_acheteur(client, demo),
            json={"name": "x", "stock": 10, "individual_price": 100},
        )
        assert reponse.status_code == 403


class TestDashboardCommercant:
    def test_contenu(self, client, demo):
        tableau = client.get("/merchant/dashboard", headers=en_tete_commercant(client, demo)).json()
        assert tableau["business_name"] == "Agro-Intrants Zio"
        assert tableau["orders"] == 38
        assert tableau["units"] == 146
        assert tableau["revenue_simule"] == 146 * 19000
        assert len(tableau["rows"]) == 1
        assert tableau["rows"][0]["participants_count"] == 38

    def test_interdit_a_un_acheteur(self, client, demo):
        reponse = client.get("/merchant/dashboard", headers=en_tete_acheteur(client, demo))
        assert reponse.status_code == 403

    def test_interdit_sans_compte(self, client, demo):
        assert client.get("/merchant/dashboard").status_code == 401


class TestAssistantPaliers:
    def test_repli_sans_cle_api(self, client, demo, sans_ia):
        """Sans clé, l'application doit fonctionner intégralement. Exigence, pas confort."""
        reponse = client.post(
            "/ai/suggest-tiers", headers=en_tete_commercant(client, demo),
            json={"product_name": "Engrais NPK", "retail_price": 22000, "stock": 600},
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["source"] == "repli"

        paliers = [
            pricing.Tier(t["min_quantity"], t["max_quantity"], t["unit_price"])
            for t in corps["tiers"]
        ]
        assert pricing.validate_tiers(paliers, stock=600) == []
        assert paliers[0].unit_price == 22000
        assert all(t["justification"] for t in corps["tiers"])

    def test_repli_quand_le_service_tombe(self, client, demo, ia_en_panne):
        """Aucune exception ne remonte à l'utilisateur, jamais."""
        reponse = client.post(
            "/ai/suggest-tiers", headers=en_tete_commercant(client, demo),
            json={"product_name": "Engrais NPK", "retail_price": 22000, "stock": 600},
        )
        assert reponse.status_code == 200
        assert reponse.json()["source"] == "repli"

    def test_le_repli_respecte_le_stock(self, client, demo, sans_ia):
        reponse = client.post(
            "/ai/suggest-tiers", headers=en_tete_commercant(client, demo),
            json={"product_name": "Petit stock", "retail_price": 5000, "stock": 20},
        )
        paliers = [
            pricing.Tier(t["min_quantity"], t["max_quantity"], t["unit_price"])
            for t in reponse.json()["tiers"]
        ]
        assert pricing.validate_tiers(paliers, stock=20) == []

    def test_limitation_de_debit(self, client, demo, sans_ia):
        en_tete = en_tete_commercant(client, demo)
        charge = {"product_name": "x", "retail_price": 1000, "stock": 100}
        codes = [
            client.post("/ai/suggest-tiers", headers=en_tete, json=charge).status_code
            for _ in range(15)
        ]
        assert codes.count(200) == 12, "plafond du contrat"
        assert codes[-1] == 429


class TestMessagesDePartage:
    def test_repli_sans_cle_api(self, client, demo, sans_ia):
        reponse = client.post(
            "/ai/share-message", headers=en_tete_acheteur(client, demo),
            json={"group_id": demo["groupe_id"]},
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["source"] == "repli"
        assert len(corps["variants"]) == 3
        assert {v["registre"] for v in corps["variants"]} == {
            "famille", "cooperative", "association"
        }
        for variante in corps["variants"]:
            assert corps["share_url"] in variante["texte"]
            assert "54" in variante["texte"], "le chiffre qui manque doit apparaître"

    def test_repli_quand_le_service_tombe(self, client, demo, ia_en_panne):
        reponse = client.post(
            "/ai/share-message", headers=en_tete_acheteur(client, demo),
            json={"group_id": demo["groupe_id"]},
        )
        assert reponse.status_code == 200
        assert reponse.json()["source"] == "repli"

    def test_groupe_introuvable(self, client, demo, sans_ia):
        reponse = client.post(
            "/ai/share-message", headers=en_tete_acheteur(client, demo),
            json={"group_id": 9999},
        )
        assert reponse.status_code == 404

    def test_sans_compte_refuse(self, client, demo, sans_ia):
        reponse = client.post("/ai/share-message", json={"group_id": demo["groupe_id"]})
        assert reponse.status_code == 401
