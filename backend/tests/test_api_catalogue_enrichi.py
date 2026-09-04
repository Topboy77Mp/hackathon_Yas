"""Deux compléments au catalogue, demandés par l'application acheteur.

1. `ProductCard.best_open_group_price` — le prix réellement en vigueur dans le
   groupe ouvert le moins cher. `best_price` est une promesse (le dernier palier,
   si on l'atteint) ; la carte produit ne doit pas afficher une remise que
   personne n'a débloquée.

2. `ProductDetail.tiers[].max_quantity` — la fiche produit affiche des
   intervalles (« 1–49 sacs »). Sans borne haute, tous les paliers se lisaient
   « 1+ ». `TierOut` reste à deux champs : c'est la forme gelée de `current_tier`
   et `next_tier` dans GroupDetail.
"""

from __future__ import annotations

from datetime import timedelta

from conftest import MOT_DE_PASSE, entete, expirer


def carte(client, produit_id: int) -> dict:
    return [p for p in client.get("/products").json() if p["id"] == produit_id][0]


class TestPrixDuGroupeOuvert:
    def test_reflete_le_prix_en_vigueur_et_non_le_meilleur_palier(self, client, demo):
        """146 sacs → palier 19 000. Le dernier palier, lui, est à 17 500."""
        offre = carte(client, demo["produit_id"])
        assert offre["best_price"] == 17500, "la promesse : le dernier palier"
        assert offre["best_open_group_price"] == 19000, "le fait : le prix du groupe"
        assert offre["open_groups_count"] == 1

    def test_suit_le_franchissement_de_palier(self, client, demo):
        client.post(
            "/auth/register",
            json={"first_name": "Kodjo", "last_name": "Test",
                  "phone": "+22894000001", "password": MOT_DE_PASSE},
        )
        client.post(
            f"/groups/{demo['groupe_id']}/join",
            headers=entete(client, "+22894000001"),
            json={"quantity": 54},
        )
        offre = carte(client, demo["produit_id"])
        assert offre["best_open_group_price"] == 17500

    def test_absent_quand_aucun_groupe_n_est_ouvert(self, client, demo):
        """Le champ vaut null : la carte n'affiche alors que le prix de détail."""
        autre = client.post(
            "/merchant/products",
            headers=entete(client, demo["commercant_phone"]),
            json={"name": "Riz parfumé", "unit_label": "sac", "stock": 200,
                  "individual_price": 18000,
                  "tiers": [{"min_quantity": 1, "max_quantity": 49, "unit_price": 18000},
                            {"min_quantity": 50, "max_quantity": None, "unit_price": 15000}]},
        ).json()

        offre = carte(client, autre["id"])
        assert offre["open_groups_count"] == 0
        assert offre["best_open_group_price"] is None
        assert offre["best_price"] == 15000

    def test_un_groupe_expire_ne_compte_plus(self, client, demo, session):
        expirer(session, demo["groupe_id"])
        offre = carte(client, demo["produit_id"])
        assert offre["open_groups_count"] == 0
        assert offre["best_open_group_price"] is None

    def test_le_groupe_le_moins_cher_l_emporte(self, client, demo, session):
        """Deux groupes ouverts : c'est le prix le plus bas qui est annoncé."""
        from models import Group, GroupStatus, utcnow

        second = Group(
            creator_id=1, product_id=demo["produit_id"], name="Petit groupe",
            target_quantity=100, min_quantity=10,
            deadline=utcnow() + timedelta(hours=24),
            status=GroupStatus.OPEN, share_code="PETIT",
        )
        session.add(second)
        session.commit()

        offre = carte(client, demo["produit_id"])
        assert offre["open_groups_count"] == 2
        # Le nouveau groupe est vide (22 000), celui de démo est à 19 000.
        assert offre["best_open_group_price"] == 19000


class TestBornesDesPaliers:
    def test_la_fiche_produit_expose_les_intervalles(self, client, demo):
        paliers = client.get(f"/products/{demo['produit_id']}").json()["tiers"]
        assert [(t["min_quantity"], t["max_quantity"]) for t in paliers] == [
            (1, 49), (50, 99), (100, 199), (200, None),
        ]

    def test_le_dernier_palier_reste_ouvert(self, client, demo):
        paliers = client.get(f"/products/{demo['produit_id']}").json()["tiers"]
        assert paliers[-1]["max_quantity"] is None

    def test_le_payload_gele_du_groupe_n_a_pas_bouge(self, client, demo):
        """GroupDetail est gelé au contrat : current_tier et next_tier à deux champs."""
        groupe = client.get(f"/groups/{demo['groupe_id']}").json()
        assert set(groupe["current_tier"]) == {"min_quantity", "unit_price"}
        assert set(groupe["next_tier"]) == {"min_quantity", "unit_price"}

    def test_la_creation_produit_renvoie_aussi_les_bornes(self, client, demo):
        cree = client.post(
            "/merchant/products",
            headers=entete(client, demo["commercant_phone"]),
            json={"name": "Ciment", "unit_label": "sac", "stock": 300,
                  "individual_price": 4500,
                  "tiers": [{"min_quantity": 1, "max_quantity": 99, "unit_price": 4500},
                            {"min_quantity": 100, "max_quantity": None, "unit_price": 4000}]},
        ).json()
        assert [(t["min_quantity"], t["max_quantity"]) for t in cree["tiers"]] == [
            (1, 99), (100, None),
        ]
