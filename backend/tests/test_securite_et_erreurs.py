"""Contrôle d'accès, forme des erreurs et cohérence des invariants.

Le contrat impose des réponses d'erreur uniformes `{detail, code}` : le front ne
devine pas. Ces tests vérifient que la règle tient sur l'ensemble des routes.
"""

from __future__ import annotations

import pytest

from conftest import MOT_DE_PASSE, entete


class TestFormeDesErreurs:
    @pytest.mark.parametrize(
        "methode, chemin, charge",
        [
            ("get", "/groups/9999", None),
            ("get", "/groups/code/INEXISTANT", None),
            ("get", "/products/9999", None),
            ("post", "/groups/9999/join", {"quantity": 1}),
        ],
    )
    def test_toute_erreur_porte_un_detail_et_un_code(self, client, demo, methode, chemin, charge):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        appel = getattr(client, methode)
        reponse = appel(chemin, headers=en_tete, json=charge) if charge else appel(chemin, headers=en_tete)

        assert reponse.status_code >= 400
        corps = reponse.json()
        assert set(corps) == {"detail", "code"}
        assert isinstance(corps["detail"], str) and corps["detail"]
        assert corps["code"].isupper()

    def test_les_codes_sont_stables(self, client, demo):
        """Le front s'appuie sur `code`, pas sur le texte : il ne doit pas dériver."""
        assert client.get("/groups/9999").json()["code"] == "GROUP_NOT_FOUND"
        assert client.get("/products/9999").json()["code"] == "PRODUCT_NOT_FOUND"


class TestAuthentification:
    def test_route_protegee_sans_jeton(self, client, demo):
        for chemin in ["/auth/me", "/orders", "/notifications", "/merchant/dashboard"]:
            reponse = client.get(chemin)
            assert reponse.status_code == 401, chemin
            assert reponse.json()["code"] == "UNAUTHENTICATED"

    def test_jeton_malforme(self, client, demo):
        for valeur in ["Bearer", "Bearer ", "Bearer abc.def", "n'importe quoi"]:
            reponse = client.get("/auth/me", headers={"Authorization": valeur})
            assert reponse.status_code == 401

    def test_jeton_signe_avec_une_autre_cle(self, client, demo):
        from datetime import timedelta

        from jose import jwt

        from models import utcnow

        faux = jwt.encode(
            {"sub": "1", "exp": utcnow() + timedelta(hours=1)},
            "mauvaise-cle", algorithm="HS256",
        )
        reponse = client.get("/auth/me", headers={"Authorization": f"Bearer {faux}"})
        assert reponse.status_code == 401

    def test_jeton_expire(self, client, demo):
        from datetime import timedelta

        from jose import jwt

        from config import JWT_ALGORITHM, JWT_SECRET
        from models import utcnow

        perime = jwt.encode(
            {"sub": "1", "exp": utcnow() - timedelta(hours=1)},
            JWT_SECRET, algorithm=JWT_ALGORITHM,
        )
        reponse = client.get("/auth/me", headers={"Authorization": f"Bearer {perime}"})
        assert reponse.status_code == 401

    def test_jeton_d_un_compte_supprime(self, client, demo, session):
        from models import User

        client.post(
            "/auth/register",
            json={"first_name": "Éphémère", "last_name": "Test",
                  "phone": "+22872000001", "password": MOT_DE_PASSE},
        )
        en_tete = entete(client, "+22872000001")
        compte = session.exec(
            __import__("sqlmodel").select(User).where(User.phone == "+22872000001")
        ).first()
        session.delete(compte)
        session.commit()

        assert client.get("/auth/me", headers=en_tete).status_code == 401

    def test_la_vue_publique_survit_a_un_jeton_pourri(self, client, demo):
        """Le lien WhatsApp ne doit jamais casser à cause d'une session périmée."""
        reponse = client.get(
            f"/groups/{demo['groupe_id']}", headers={"Authorization": "Bearer pourri"}
        )
        assert reponse.status_code == 200
        assert reponse.json()["my_membership"] is None


class TestCloisonnementDesDonnees:
    def test_commande_d_autrui_invisible(self, client, demo):
        a = entete(client, demo["acheteurs"][0].phone)
        b = entete(client, demo["acheteurs"][1].phone)
        commande_id = client.get("/orders", headers=a).json()[0]["id"]

        assert client.get(f"/orders/{commande_id}", headers=b).status_code == 404
        assert client.post(f"/orders/{commande_id}/pay", headers=b).status_code == 404

    def test_notification_d_autrui_invisible(self, client, demo):
        client.post(
            "/demo/simulate-joins", headers={"X-Demo-Token": "jokkoo-demo"},
            json={"group_id": demo["groupe_id"], "count": 18, "quantity": 3},
        )
        a = entete(client, demo["acheteurs"][0].phone)
        b = entete(client, demo["acheteurs"][1].phone)
        notif_id = client.get("/notifications", headers=a).json()["notifications"][0]["id"]

        assert client.post(f"/notifications/{notif_id}/read", headers=b).status_code == 404

    def test_chacun_ne_voit_que_ses_commandes(self, client, demo):
        a = entete(client, demo["acheteurs"][0].phone)
        commandes = client.get("/orders", headers=a).json()
        assert len(commandes) == 1


class TestValidationDesEntrees:
    @pytest.mark.parametrize("quantite", [0, -5])
    def test_quantite_non_positive_refusee(self, client, demo, quantite):
        en_tete = entete(client, demo["acheteurs"][5].phone)
        reponse = client.post(
            f"/groups/{demo['groupe_id']}/join", headers=en_tete, json={"quantity": quantite}
        )
        assert reponse.status_code == 422

    def test_mot_de_passe_trop_court(self, client, demo):
        reponse = client.post(
            "/auth/register",
            json={"first_name": "A", "last_name": "B", "phone": "+22873000001", "password": "123"},
        )
        assert reponse.status_code == 422

    def test_champs_obligatoires(self, client, demo):
        assert client.post("/auth/register", json={"phone": "+22873000002"}).status_code == 422


class TestInvariantsMetier:
    def test_le_client_ne_peut_pas_imposer_un_prix(self, client, demo):
        """D3 : le prix est calculé côté serveur, un payload ne le fixe jamais."""
        en_tete = entete(client, demo["acheteurs"][7].phone)
        client.post(f"/groups/{demo['groupe_id']}/leave", headers=en_tete)

        reponse = client.post(
            f"/groups/{demo['groupe_id']}/join", headers=en_tete,
            json={"quantity": 2, "unit_price": 1, "total_amount": 1},
        )
        assert reponse.status_code == 200
        assert reponse.json()["order"]["unit_price"] == 19000
        assert reponse.json()["order"]["total_amount"] == 38000

    def test_la_quantite_du_groupe_est_toujours_recalculee(self, client, demo, session):
        """L'invariant du contrat : jamais stocké en dur sans recalcul."""
        from sqlmodel import select

        from models import Order, OrderStatus

        groupe = client.get(f"/groups/{demo['groupe_id']}").json()
        somme = sum(
            c.quantity
            for c in session.exec(
                select(Order).where(
                    Order.group_id == demo["groupe_id"],
                    Order.order_status != OrderStatus.CANCELLED,
                )
            ).all()
        )
        assert groupe["current_quantity"] == somme

    def test_quitter_puis_revenir(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][3].phone)
        avant = client.get(f"/groups/{demo['groupe_id']}").json()["current_quantity"]

        client.post(f"/groups/{demo['groupe_id']}/leave", headers=en_tete)
        client.post(f"/groups/{demo['groupe_id']}/join", headers=en_tete, json={"quantity": 4})

        apres = client.get(f"/groups/{demo['groupe_id']}").json()["current_quantity"]
        assert apres == avant

    def test_quitter_sans_participer(self, client, demo):
        client.post(
            "/auth/register",
            json={"first_name": "Étranger", "last_name": "Test",
                  "phone": "+22874000001", "password": MOT_DE_PASSE},
        )
        reponse = client.post(
            f"/groups/{demo['groupe_id']}/leave", headers=entete(client, "+22874000001")
        )
        assert reponse.status_code == 409
        assert reponse.json()["code"] == "NOT_A_MEMBER"


class TestSante:
    def test_health(self, client):
        assert client.get("/health").json() == {"status": "ok"}

    def test_openapi_publie(self, client):
        schema = client.get("/openapi.json").json()
        assert "GroupDetail" in schema["components"]["schemas"]
        # 20 champs du contrat + `tiers[]`, ajouté après arbitrage humain.
        assert len(schema["components"]["schemas"]["GroupDetail"]["properties"]) == 21
