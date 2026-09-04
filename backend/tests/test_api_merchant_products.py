"""`GET /merchant/products` — la liste des offres vue par leur propriétaire.

Le catalogue public masque les brouillons et n'expose pas le stock. Sans cet
endpoint, un produit créé sans grille devenait invisible à celui-là même qui
venait de le saisir : le dashboard n'avait aucun moyen de le lui montrer.
"""

from __future__ import annotations

from conftest import MOT_DE_PASSE, entete


def commercant(client, demo) -> dict:
    return entete(client, demo["commercant_phone"])


class TestListeDesOffres:
    def test_le_produit_seede_est_renvoye_avec_sa_grille(self, client, demo):
        reponse = client.get("/merchant/products", headers=commercant(client, demo))
        assert reponse.status_code == 200

        produits = reponse.json()["products"]
        assert len(produits) == 1

        offre = produits[0]
        assert offre["name"] == "Engrais NPK 15-15-15"
        assert offre["status"] == "ACTIVE"
        assert offre["stock"] == 600
        assert offre["individual_price"] == 22000
        assert [t["min_quantity"] for t in offre["tiers"]] == [1, 50, 100, 200]
        assert [t["unit_price"] for t in offre["tiers"]] == [22000, 20500, 19000, 17500]

    def test_le_meilleur_prix_est_le_dernier_palier(self, client, demo):
        offre = client.get(
            "/merchant/products", headers=commercant(client, demo)
        ).json()["products"][0]
        assert offre["best_price"] == 17500

    def test_les_volumes_engages_sont_agreges(self, client, demo):
        """146 sacs sur un groupe : c'est le chiffre que la carte doit afficher."""
        offre = client.get(
            "/merchant/products", headers=commercant(client, demo)
        ).json()["products"][0]
        assert offre["groups_count"] == 1
        assert offre["reserved_units"] == 146

    def test_un_brouillon_reste_visible_a_son_proprietaire(self, client, demo):
        """Créé sans paliers, le produit n'est pas au catalogue public.

        Il doit malgré tout apparaître dans l'espace commerçant, sans quoi son
        auteur ne peut plus jamais lui ajouter de grille.
        """
        en_tete = commercant(client, demo)
        client.post(
            "/merchant/products",
            headers=en_tete,
            json={"name": "Semences de maïs", "unit_label": "sachet",
                  "stock": 320, "individual_price": 5500},
        )

        public = client.get("/products").json()
        assert [p["name"] for p in public] == ["Engrais NPK 15-15-15"]

        prive = client.get("/merchant/products", headers=en_tete).json()["products"]
        brouillon = [p for p in prive if p["name"] == "Semences de maïs"]
        assert len(brouillon) == 1
        assert brouillon[0]["status"] == "DRAFT"
        assert brouillon[0]["tiers"] == []
        assert brouillon[0]["best_price"] == 5500, "sans grille, le prix de détail"
        assert brouillon[0]["reserved_units"] == 0

    def test_une_grille_ajoutee_active_le_produit_dans_la_liste(self, client, demo):
        en_tete = commercant(client, demo)
        cree = client.post(
            "/merchant/products",
            headers=en_tete,
            json={"name": "Semences de maïs", "unit_label": "sachet",
                  "stock": 320, "individual_price": 5500},
        ).json()

        client.post(
            f"/merchant/products/{cree['id']}/tiers",
            headers=en_tete,
            json={"tiers": [
                {"min_quantity": 1, "max_quantity": 39, "unit_price": 5500},
                {"min_quantity": 40, "max_quantity": None, "unit_price": 4700},
            ]},
        )

        produits = client.get("/merchant/products", headers=en_tete).json()["products"]
        maïs = [p for p in produits if p["id"] == cree["id"]][0]
        assert maïs["status"] == "ACTIVE"
        assert maïs["best_price"] == 4700


class TestCloisonnement:
    def test_un_commercant_ne_voit_pas_les_offres_d_un_autre(self, client, demo, session):
        """Le cloisonnement est la seule chose qui rende l'endpoint publiable."""
        from models import Merchant, Product, ProductStatus, User, UserRole
        from conftest import EMPREINTE

        autre = User(first_name="Kossi", last_name="Rival", phone="+22890000009",
                     password_hash=EMPREINTE, role=UserRole.MERCHANT)
        session.add(autre)
        session.flush()
        boutique = Merchant(user_id=autre.id, business_name="Rival SARL")
        session.add(boutique)
        session.flush()
        session.add(Product(merchant_id=boutique.id, name="Ciment", unit_label="sac",
                            stock=100, individual_price=4000,
                            status=ProductStatus.ACTIVE))
        session.commit()

        noms = [
            p["name"]
            for p in client.get(
                "/merchant/products", headers=commercant(client, demo)
            ).json()["products"]
        ]
        assert noms == ["Engrais NPK 15-15-15"]
        assert "Ciment" not in noms

    def test_authentification_requise(self, client, demo):
        assert client.get("/merchant/products").status_code == 401

    def test_un_acheteur_est_refuse(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        assert client.get("/merchant/products", headers=en_tete).status_code == 403

    def test_un_commercant_sans_produit_recoit_une_liste_vide(self, client, demo):
        client.post(
            "/auth/register",
            json={"first_name": "Neuf", "last_name": "Commerce",
                  "phone": "+22890000077", "password": MOT_DE_PASSE},
        )
        # Un compte fraîchement inscrit est un acheteur : sans profil commerçant,
        # l'accès est refusé avant même d'arriver à la liste.
        en_tete = entete(client, "+22890000077")
        assert client.get("/merchant/products", headers=en_tete).status_code == 403
