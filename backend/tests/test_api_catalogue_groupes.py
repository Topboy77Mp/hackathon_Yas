"""Catalogue et cycle de vie des groupes."""

from __future__ import annotations

from conftest import MOT_DE_PASSE, entete, expirer


def inscrire(client, phone: str) -> dict:
    client.post(
        "/auth/register",
        json={"first_name": "Test", "last_name": "Test",
              "phone": phone, "password": MOT_DE_PASSE},
    )
    return entete(client, phone)


class TestCatalogue:
    def test_liste_des_produits(self, client, demo):
        produits = client.get("/products").json()
        assert len(produits) == 1
        produit = produits[0]
        assert produit["individual_price"] == 22000
        assert produit["best_price"] == 17500, "le meilleur prix atteignable donne envie de cliquer"
        assert produit["open_groups_count"] == 1
        assert produit["merchant_name"] == "Agro-Intrants Zio"

    def test_fiche_produit(self, client, demo):
        produit = client.get(f"/products/{demo['produit_id']}").json()
        assert produit["stock"] == 600
        assert produit["merchant_location"] == "Tsévié"
        assert [t["min_quantity"] for t in produit["tiers"]] == [1, 50, 100, 200]
        assert [t["unit_price"] for t in produit["tiers"]] == [22000, 20500, 19000, 17500]
        assert len(produit["open_groups"]) == 1

    def test_produit_introuvable(self, client, demo):
        reponse = client.get("/products/9999")
        assert reponse.status_code == 404
        assert reponse.json()["code"] == "PRODUCT_NOT_FOUND"

    def test_le_catalogue_est_public(self, client, demo):
        assert client.get("/products").status_code == 200

    def test_un_brouillon_reste_invisible(self, client, demo, session):
        """Un produit sans grille de paliers valide n'est pas vendable."""
        from models import Product, ProductStatus

        brouillon = Product(
            merchant_id=1, name="Brouillon", unit_label="sac",
            stock=10, individual_price=1000, status=ProductStatus.DRAFT,
        )
        session.add(brouillon)
        session.commit()

        noms = [p["name"] for p in client.get("/products").json()]
        assert "Brouillon" not in noms
        assert client.get(f"/products/{brouillon.id}").status_code == 404


class TestCreationDeGroupe:
    def test_creation_nominale(self, client, demo):
        en_tete = inscrire(client, "+22870000001")
        reponse = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Coopérative de Tsévié",
                  "target_quantity": 300, "min_quantity": 100,
                  "deadline_hours": 48, "quantity": 5},
        )
        assert reponse.status_code == 201
        groupe = reponse.json()
        assert groupe["name"] == "Coopérative de Tsévié"
        assert groupe["current_quantity"] == 5
        assert groupe["participants_count"] == 1, "le créateur rejoint son propre groupe"
        assert groupe["my_membership"]["joined"] is True
        assert len(groupe["share_code"]) == 5

    def test_codes_de_partage_uniques(self, client, demo):
        en_tete = inscrire(client, "+22870000002")
        codes = set()
        for index in range(5):
            reponse = client.post(
                "/groups", headers=en_tete,
                json={"product_id": demo["produit_id"], "name": f"Groupe {index}",
                      "target_quantity": 100, "min_quantity": 10, "quantity": 1},
            )
            codes.add(reponse.json()["share_code"])
        assert len(codes) == 5

    def test_minimum_superieur_a_objectif_refuse(self, client, demo):
        en_tete = inscrire(client, "+22870000003")
        reponse = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Incohérent",
                  "target_quantity": 50, "min_quantity": 100, "quantity": 1},
        )
        assert reponse.status_code == 422
        assert reponse.json()["code"] == "MIN_ABOVE_TARGET"

    def test_quantite_au_dela_du_stock_refusee(self, client, demo):
        en_tete = inscrire(client, "+22870000004")
        reponse = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Trop gros",
                  "target_quantity": 900, "min_quantity": 1, "quantity": 700},
        )
        assert reponse.status_code == 409
        assert reponse.json()["code"] == "OUT_OF_STOCK"

    def test_produit_inexistant(self, client, demo):
        en_tete = inscrire(client, "+22870000005")
        reponse = client.post(
            "/groups", headers=en_tete,
            json={"product_id": 9999, "name": "Fantôme",
                  "target_quantity": 100, "min_quantity": 10, "quantity": 1},
        )
        assert reponse.status_code == 404

    def test_creation_sans_compte_refusee(self, client, demo):
        reponse = client.post(
            "/groups",
            json={"product_id": demo["produit_id"], "name": "Anonyme",
                  "target_quantity": 100, "min_quantity": 10, "quantity": 1},
        )
        assert reponse.status_code == 401


class TestListeDesGroupes:
    def test_liste_et_filtre_par_produit(self, client, demo):
        assert len(client.get("/groups").json()) == 1
        assert len(client.get(f"/groups?product_id={demo['produit_id']}").json()) == 1
        assert client.get("/groups?product_id=9999").json() == []

    def test_contenu_de_la_carte(self, client, demo):
        carte = client.get("/groups").json()[0]
        assert carte["share_code"] == "KOVIE"
        assert carte["current_quantity"] == 146
        assert carte["current_unit_price"] == 19000
        assert carte["progress_ratio"] == 0.73
        assert carte["seconds_remaining"] > 0

    def test_un_groupe_expire_disparait_des_listes(self, client, demo, session):
        """Un groupe dont l'échéance est passée ne doit plus être annoncé ouvert,
        y compris avant que quiconque ait ouvert sa fiche."""
        expirer(session, demo["groupe_id"])

        assert client.get("/groups").json() == []
        assert client.get("/stats/impact").json()["groups_active"] == 0
        assert client.get(f"/products/{demo['produit_id']}").json()["open_groups"] == []


class TestClotureAEcheance:
    def test_objectif_minimum_atteint(self, client, demo, session):
        """146 sacs pour un minimum de 100 : le groupe se verrouille."""
        expirer(session, demo["groupe_id"])
        groupe = client.get(f"/groups/{demo['groupe_id']}").json()
        assert groupe["status"] == "LOCKED"

        from sqlmodel import select
        from models import Order

        commandes = session.exec(
            select(Order).where(Order.group_id == demo["groupe_id"])
        ).all()
        assert {c.order_status.value for c in commandes} == {"CONFIRMED"}

    def test_objectif_minimum_manque(self, client, demo, session):
        en_tete = inscrire(client, "+22870000006")
        cree = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Groupe qui échoue",
                  "target_quantity": 200, "min_quantity": 100, "quantity": 3},
        ).json()

        commande_id = client.get("/orders", headers=en_tete).json()[0]["id"]
        client.post(f"/orders/{commande_id}/pay", headers=en_tete)

        expirer(session, cree["id"])
        groupe = client.get(f"/groups/{cree['id']}").json()
        assert groupe["status"] == "CANCELLED"

        commande = client.get(f"/orders/{commande_id}", headers=en_tete).json()
        assert commande["order_status"] == "CANCELLED"
        assert commande["payment_status"] == "REFUNDED"

    def test_le_remboursement_atteint_le_paiement(self, client, demo, session):
        en_tete = inscrire(client, "+22870000007")
        cree = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Échec avec paiement",
                  "target_quantity": 200, "min_quantity": 100, "quantity": 2},
        ).json()
        commande_id = client.get("/orders", headers=en_tete).json()[0]["id"]
        client.post(f"/orders/{commande_id}/pay", headers=en_tete)

        expirer(session, cree["id"])
        client.get(f"/groups/{cree['id']}")

        from sqlmodel import select
        from models import Payment

        paiements = session.exec(
            select(Payment).where(Payment.order_id == commande_id)
        ).all()
        assert {p.status.value for p in paiements} == {"REFUNDED"}

    def test_rejoindre_un_groupe_expire_refuse(self, client, demo, session):
        expirer(session, demo["groupe_id"])
        en_tete = inscrire(client, "+22870000008")
        reponse = client.post(
            f"/groups/{demo['groupe_id']}/join", headers=en_tete, json={"quantity": 1}
        )
        assert reponse.status_code == 409
        assert reponse.json()["code"] in {"GROUP_EXPIRED", "GROUP_NOT_OPEN"}

    def test_la_cloture_est_idempotente(self, client, demo, session):
        expirer(session, demo["groupe_id"])
        premier = client.get(f"/groups/{demo['groupe_id']}").json()["status"]
        second = client.get(f"/groups/{demo['groupe_id']}").json()["status"]
        assert premier == second == "LOCKED"
