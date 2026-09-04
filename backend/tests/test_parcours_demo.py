"""Test du parcours de démonstration, de bout en bout.

Le contrat borne la Phase 3 à `pricing.py` et à ce parcours. C'est la séquence
que le jury verra : un groupe à 146 sacs, des participants qui arrivent, un
palier qui tombe, et tout le groupe qui passe au nouveau prix.
"""

from __future__ import annotations

from conftest import MOT_DE_PASSE, entete


class TestParcoursAcheteur:
    def test_inscription_puis_consultation(self, client, demo):
        reponse = client.post(
            "/auth/register",
            json={"first_name": "Aïcha", "last_name": "Touré",
                  "phone": "+22870112233", "password": MOT_DE_PASSE},
        )
        assert reponse.status_code == 200
        assert reponse.json()["user"]["phone"] == "+22870112233"

        moi = client.get("/auth/me", headers={"Authorization": f"Bearer {reponse.json()['token']}"})
        assert moi.status_code == 200
        assert moi.json()["role"] == "USER"

    def test_telephone_deja_inscrit(self, client, demo):
        charge = {"first_name": "A", "last_name": "B",
                  "phone": "+22870999999", "password": MOT_DE_PASSE}
        assert client.post("/auth/register", json=charge).status_code == 200
        doublon = client.post("/auth/register", json=charge)
        assert doublon.status_code == 409
        assert doublon.json()["code"] == "PHONE_TAKEN"

    def test_mot_de_passe_faux(self, client, demo):
        reponse = client.post(
            "/auth/login", json={"phone": demo["commercant_phone"], "password": "faux"}
        )
        assert reponse.status_code == 401
        assert reponse.json()["code"] == "BAD_CREDENTIALS"


class TestEtatDeDepart:
    def test_le_groupe_est_a_146_sacs(self, client, demo):
        groupe = client.get(f"/groups/{demo['groupe_id']}").json()
        assert groupe["participants_count"] == 38
        assert groupe["current_quantity"] == 146
        assert groupe["current_unit_price"] == 19000
        assert groupe["quantity_to_next_tier"] == 54
        assert groupe["next_tier"]["unit_price"] == 17500
        assert groupe["group_total_saving"] == 438_000

    def test_payload_complet_et_conforme(self, client, demo):
        """Le payload doit être auto-suffisant : l'écran groupe se dessine sans second appel."""
        groupe = client.get(f"/groups/{demo['groupe_id']}").json()
        attendus = {
            "id", "name", "share_code", "status", "deadline", "seconds_remaining",
            "product", "participants_count", "current_quantity", "target_quantity",
            "min_quantity", "current_unit_price", "current_tier", "next_tier",
            "quantity_to_next_tier", "progress_ratio", "unit_saving",
            "potential_unit_saving", "group_total_saving", "my_membership",
        }
        assert set(groupe) == attendus

    def test_lien_partage_consultable_sans_compte(self, client, demo):
        """Le chemin qu'empruntera le jury depuis WhatsApp."""
        reponse = client.get("/groups/code/kovie")
        assert reponse.status_code == 200
        assert reponse.json()["my_membership"] is None

    def test_jeton_invalide_ne_casse_pas_la_vue_publique(self, client, demo):
        reponse = client.get(
            f"/groups/{demo['groupe_id']}", headers={"Authorization": "Bearer nimportequoi"}
        )
        assert reponse.status_code == 200


class TestFranchissementDePalier:
    def test_le_prix_tombe_et_tout_le_groupe_en_profite(self, client, demo):
        """Le moment central de la démonstration."""
        groupe_id = demo["groupe_id"]

        reponse = client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": groupe_id, "count": 18, "quantity": 3},
        )
        assert reponse.status_code == 200
        corps = reponse.json()

        assert corps["tier_unlocked"] is True
        assert corps["previous_unit_price"] == 19000
        assert corps["new_unit_price"] == 17500
        assert corps["group"]["current_quantity"] == 200
        assert corps["group"]["group_total_saving"] == 900_000

    def test_les_commandes_anterieures_sont_repricees(self, client, demo, session):
        """Règle rétroactive : les 38 commandes de départ passent aussi à 17 500."""
        from sqlmodel import select
        from models import Order, OrderStatus

        client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )

        prix = {
            commande.unit_price
            for commande in session.exec(
                select(Order).where(
                    Order.group_id == demo["groupe_id"],
                    Order.order_status != OrderStatus.CANCELLED,
                )
            ).all()
        }
        assert prix == {17500}, "toutes les commandes actives partagent un seul prix"

    def test_le_total_suit_le_nouveau_prix(self, client, demo, session):
        from sqlmodel import select
        from models import Order, OrderStatus

        client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )
        commandes = session.exec(
            select(Order).where(
                Order.group_id == demo["groupe_id"],
                Order.order_status != OrderStatus.CANCELLED,
            )
        ).all()
        assert all(c.total_amount == c.unit_price * c.quantity for c in commandes)

    def test_jeton_de_demo_exige(self, client, demo):
        reponse = client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "mauvais"},
            json={"group_id": demo["groupe_id"], "count": 1},
        )
        assert reponse.status_code == 403


class TestRejoindre:
    def test_rejoindre_cree_une_commande(self, client, demo):
        client.post(
            "/auth/register",
            json={"first_name": "Aïcha", "last_name": "Touré",
                  "phone": "+22870112233", "password": MOT_DE_PASSE},
        )
        en_tete = entete(client, "+22870112233")

        reponse = client.post(
            f"/groups/{demo['groupe_id']}/join", headers=en_tete, json={"quantity": 4}
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["order"]["quantity"] == 4
        assert corps["order"]["unit_price"] == 19000
        assert corps["order"]["total_amount"] == 76000
        assert corps["group"]["current_quantity"] == 150
        assert corps["group"]["my_membership"]["joined"] is True

    def test_rejoindre_deux_fois_refuse(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        reponse = client.post(
            f"/groups/{demo['groupe_id']}/join", headers=en_tete, json={"quantity": 1}
        )
        assert reponse.status_code == 409
        assert reponse.json()["code"] == "ALREADY_JOINED"

    def test_rejoindre_sans_compte_refuse(self, client, demo):
        reponse = client.post(f"/groups/{demo['groupe_id']}/join", json={"quantity": 1})
        assert reponse.status_code == 401

    def test_stock_insuffisant_refuse(self, client, demo):
        reponse = client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 200, "quantity": 50},
        )
        assert reponse.status_code == 409
        assert reponse.json()["code"] == "OUT_OF_STOCK"

    def test_quitter_libere_la_quantite(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        reponse = client.post(f"/groups/{demo['groupe_id']}/leave", headers=en_tete)
        assert reponse.status_code == 200
        assert reponse.json()["current_quantity"] == 142  # 146 − 4
        assert reponse.json()["my_membership"] is None


class TestCommandeEtPaiement:
    def test_paiement_simule(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        commande_id = client.get("/orders", headers=en_tete).json()[0]["id"]

        reponse = client.post(f"/orders/{commande_id}/pay", headers=en_tete)
        assert reponse.status_code == 200
        assert reponse.json()["payment"]["status"] == "SUCCESS"
        assert reponse.json()["order"]["order_status"] == "CONFIRMED"

        rejeu = client.post(f"/orders/{commande_id}/pay", headers=en_tete)
        assert rejeu.status_code == 409
        assert rejeu.json()["code"] == "ALREADY_PAID"

    def test_commande_d_autrui_invisible(self, client, demo):
        en_tete_a = entete(client, demo["acheteurs"][0].phone)
        en_tete_b = entete(client, demo["acheteurs"][1].phone)
        commande_id = client.get("/orders", headers=en_tete_a).json()[0]["id"]

        reponse = client.get(f"/orders/{commande_id}", headers=en_tete_b)
        assert reponse.status_code == 404


class TestImpact:
    def test_kpi_avant_et_apres_franchissement(self, client, demo):
        avant = client.get("/stats/impact").json()
        assert avant["community_savings"] == 438_000
        assert avant["units_ordered"] == 146

        client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )

        apres = client.get("/stats/impact").json()
        assert apres["community_savings"] == 900_000  # le chiffre du pitch
        assert apres["units_ordered"] == 200
        assert apres["groups_active"] == 1


class TestNotifications:
    def test_le_franchissement_notifie_les_membres(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        assert client.get("/notifications", headers=en_tete).json()["unread_count"] == 0

        client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )

        boite = client.get("/notifications", headers=en_tete).json()
        assert boite["unread_count"] == 1
        assert boite["notifications"][0]["type"] == "TIER_UNLOCKED"
        assert "17500" in boite["notifications"][0]["message"]

    def test_marquer_comme_lue(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        client.post(
            "/demo/simulate-joins",
            headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )
        identifiant = client.get("/notifications", headers=en_tete).json()["notifications"][0]["id"]

        assert client.post(f"/notifications/{identifiant}/read", headers=en_tete).json()["read"] is True
        assert client.get("/notifications", headers=en_tete).json()["unread_count"] == 0


class TestAssistantsIA:
    def test_les_paliers_proposes_sont_toujours_coherents(self, client, demo):
        """Que la réponse vienne du modèle ou du repli, la grille est valide."""
        import pricing

        en_tete = entete(client, demo["commercant_phone"])
        reponse = client.post(
            "/ai/suggest-tiers", headers=en_tete,
            json={"product_name": "Engrais NPK", "retail_price": 22000, "stock": 600},
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["source"] in {"ia", "repli"}

        paliers = [
            pricing.Tier(t["min_quantity"], t["max_quantity"], t["unit_price"])
            for t in corps["tiers"]
        ]
        assert pricing.validate_tiers(paliers, stock=600) == []
        assert paliers[0].unit_price == 22000, "le premier palier reste le prix de détail"

    def test_reserve_aux_commercants(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        reponse = client.post(
            "/ai/suggest-tiers", headers=en_tete,
            json={"product_name": "x", "retail_price": 1000, "stock": 10},
        )
        assert reponse.status_code == 403

    def test_messages_de_partage_toujours_exploitables(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        reponse = client.post(
            "/ai/share-message", headers=en_tete, json={"group_id": demo["groupe_id"]}
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["share_url"].endswith("/g/KOVIE")
        assert len(corps["variants"]) >= 2
        for variante in corps["variants"]:
            assert corps["share_url"] in variante["texte"]
