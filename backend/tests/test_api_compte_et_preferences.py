"""Réinitialisation de mot de passe, changement de mot de passe, préférences,
et tri du catalogue.

Le flux de réinitialisation est complet côté serveur — code à usage unique,
haché, daté — mais sa remise passe par le canal de démonstration : le contrat
exclut tout service externe, donc toute passerelle SMS. Ces tests vérifient
d'abord ce qui protège le compte, pas le confort.
"""

from __future__ import annotations

from datetime import timedelta

from conftest import MOT_DE_PASSE, entete, jeton

DEMO = {"X-Demo-Token": "jokkoo-demo"}


def demander_code(client, phone: str) -> str | None:
    return client.post(
        "/auth/forgot-password", headers=DEMO, json={"phone": phone}
    ).json()["demo_code"]


class TestDemandeDeCode:
    def test_un_numero_inconnu_repond_comme_un_numero_connu(self, client, demo):
        """Sinon l'endpoint devient un annuaire des inscrits."""
        connu = client.post(
            "/auth/forgot-password", json={"phone": demo["acheteurs"][0].phone}
        )
        inconnu = client.post("/auth/forgot-password", json={"phone": "+22899999999"})

        assert connu.status_code == inconnu.status_code == 200
        assert connu.json() == inconnu.json() == {"sent": True, "demo_code": None}

    def test_le_code_n_est_donne_qu_avec_le_jeton_de_demonstration(self, client, demo):
        phone = demo["acheteurs"][0].phone
        assert client.post("/auth/forgot-password", json={"phone": phone}).json()["demo_code"] is None

        avec = demander_code(client, phone)
        assert avec is not None and len(avec) == 6 and avec.isdigit()

    def test_un_mauvais_jeton_ne_donne_rien(self, client, demo):
        corps = client.post(
            "/auth/forgot-password",
            headers={"X-Demo-Token": "faux"},
            json={"phone": demo["acheteurs"][0].phone},
        ).json()
        assert corps["demo_code"] is None

    def test_le_code_n_est_pas_stocke_en_clair(self, client, demo, session):
        from models import PasswordResetCode

        from sqlmodel import select

        code = demander_code(client, demo["acheteurs"][0].phone)
        lignes = session.exec(select(PasswordResetCode)).all()
        assert len(lignes) == 1
        assert lignes[0].code_hash != code, "l'empreinte ne doit pas être le code"

    def test_une_nouvelle_demande_invalide_la_precedente(self, client, demo):
        """Deux codes valides en même temps, c'est deux portes ouvertes."""
        phone = demo["acheteurs"][0].phone
        premier = demander_code(client, phone)
        second = demander_code(client, phone)

        refus = client.post(
            "/auth/reset-password",
            json={"phone": phone, "code": premier, "new_password": "nouveau123"},
        )
        assert refus.status_code == 400

        ok = client.post(
            "/auth/reset-password",
            json={"phone": phone, "code": second, "new_password": "nouveau123"},
        )
        assert ok.status_code == 200


class TestReinitialisation:
    def test_le_mot_de_passe_est_reellement_change(self, client, demo):
        phone = demo["acheteurs"][0].phone
        code = demander_code(client, phone)

        reponse = client.post(
            "/auth/reset-password",
            json={"phone": phone, "code": code, "new_password": "toutneuf1"},
        )
        assert reponse.status_code == 200
        assert reponse.json()["token"], "on est connecté dans la foulée"

        assert client.post(
            "/auth/login", json={"phone": phone, "password": MOT_DE_PASSE}
        ).status_code == 401, "l'ancien mot de passe ne marche plus"
        assert client.post(
            "/auth/login", json={"phone": phone, "password": "toutneuf1"}
        ).status_code == 200

    def test_un_code_ne_sert_qu_une_fois(self, client, demo):
        phone = demo["acheteurs"][0].phone
        code = demander_code(client, phone)

        client.post("/auth/reset-password",
                    json={"phone": phone, "code": code, "new_password": "premier12"})
        rejeu = client.post("/auth/reset-password",
                            json={"phone": phone, "code": code, "new_password": "second123"})
        assert rejeu.status_code == 400

    def test_un_code_expire_est_refuse(self, client, demo, session):
        from sqlmodel import select
        from models import PasswordResetCode, utcnow

        phone = demo["acheteurs"][0].phone
        code = demander_code(client, phone)

        ligne = session.exec(select(PasswordResetCode)).one()
        ligne.expires_at = utcnow() - timedelta(minutes=1)
        session.add(ligne)
        session.commit()

        assert client.post(
            "/auth/reset-password",
            json={"phone": phone, "code": code, "new_password": "toutneuf1"},
        ).status_code == 400

    def test_un_code_ne_vaut_que_pour_son_compte(self, client, demo):
        """Le code d'Alice ne doit pas réinitialiser le compte de Bob."""
        code_alice = demander_code(client, demo["acheteurs"][0].phone)
        assert client.post(
            "/auth/reset-password",
            json={"phone": demo["acheteurs"][1].phone,
                  "code": code_alice, "new_password": "pirate123"},
        ).status_code == 400

    def test_mauvais_code(self, client, demo):
        phone = demo["acheteurs"][0].phone
        demander_code(client, phone)
        assert client.post(
            "/auth/reset-password",
            json={"phone": phone, "code": "000000", "new_password": "toutneuf1"},
        ).status_code == 400


class TestChangementDepuisLeCompte:
    def test_changement_reussi(self, client, demo):
        phone = demo["acheteurs"][0].phone
        reponse = client.post(
            "/auth/change-password",
            headers=entete(client, phone),
            json={"current_password": MOT_DE_PASSE, "new_password": "changement1"},
        )
        assert reponse.status_code == 200
        assert client.post(
            "/auth/login", json={"phone": phone, "password": "changement1"}
        ).status_code == 200

    def test_mot_de_passe_actuel_incorrect(self, client, demo):
        reponse = client.post(
            "/auth/change-password",
            headers=entete(client, demo["acheteurs"][0].phone),
            json={"current_password": "faux", "new_password": "changement1"},
        )
        assert reponse.status_code == 400
        assert reponse.json()["code"] == "BAD_PASSWORD"

    def test_le_nouveau_doit_differer(self, client, demo):
        reponse = client.post(
            "/auth/change-password",
            headers=entete(client, demo["acheteurs"][0].phone),
            json={"current_password": MOT_DE_PASSE, "new_password": MOT_DE_PASSE},
        )
        assert reponse.status_code == 400
        assert reponse.json()["code"] == "SAME_PASSWORD"

    def test_authentification_requise(self, client, demo):
        assert client.post(
            "/auth/change-password",
            json={"current_password": MOT_DE_PASSE, "new_password": "changement1"},
        ).status_code == 401


class TestPreferences:
    def test_valeurs_par_defaut_a_la_premiere_lecture(self, client, demo):
        corps = client.get(
            "/me/preferences", headers=entete(client, demo["acheteurs"][0].phone)
        ).json()
        assert corps == {"notifications_enabled": True, "default_share_register": "famille"}

    def test_modification_partielle(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        corps = client.patch(
            "/me/preferences", headers=en_tete, json={"notifications_enabled": False}
        ).json()
        assert corps["notifications_enabled"] is False
        assert corps["default_share_register"] == "famille", "champ omis = inchangé"

    def test_la_preference_est_persistee(self, client, demo):
        en_tete = entete(client, demo["acheteurs"][0].phone)
        client.patch("/me/preferences", headers=en_tete,
                     json={"default_share_register": "cooperative"})
        assert client.get("/me/preferences", headers=en_tete).json()[
            "default_share_register"
        ] == "cooperative"

    def test_couper_les_notifications_eteint_le_badge_sans_effacer_l_historique(
        self, client, demo, session
    ):
        from models import Notification

        acheteur = demo["acheteurs"][0]
        session.add(
            Notification(user_id=acheteur.id, type="TIER_UNLOCKED",
                         title="Palier débloqué", message="Le prix a baissé.")
        )
        session.commit()

        en_tete = entete(client, acheteur.phone)
        avant = client.get("/notifications", headers=en_tete).json()
        assert avant["unread_count"] == 1

        client.patch("/me/preferences", headers=en_tete,
                     json={"notifications_enabled": False})

        apres = client.get("/notifications", headers=en_tete).json()
        assert apres["unread_count"] == 0, "le badge se tait"
        assert len(apres["notifications"]) == 1, "l'historique reste consultable"

    def test_les_preferences_sont_cloisonnees(self, client, demo):
        premier = entete(client, demo["acheteurs"][0].phone)
        second = entete(client, demo["acheteurs"][1].phone)

        client.patch("/me/preferences", headers=premier,
                     json={"notifications_enabled": False})
        assert client.get("/me/preferences", headers=second).json()[
            "notifications_enabled"
        ] is True

    def test_authentification_requise(self, client, demo):
        assert client.get("/me/preferences").status_code == 401


class TestCatalogueTrieEtFiltre:
    def test_tri_par_nom_par_defaut(self, client, demo):
        noms = [p["name"] for p in client.get("/products").json()]
        assert noms == sorted(noms, key=str.lower)

    def test_recherche_par_nom(self, client, demo):
        noms = [p["name"] for p in client.get("/products?q=engrais").json()]
        assert noms == ["Engrais NPK 15-15-15"]

    def test_recherche_sans_resultat(self, client, demo):
        assert client.get("/products?q=ordinateur").json() == []

    def test_tri_par_prix_croissant(self, client, demo):
        cartes = client.get("/products?sort=price_asc").json()
        prix = [c["best_open_group_price"] or c["individual_price"] for c in cartes]
        assert prix == sorted(prix)

    def test_tri_par_prix_decroissant(self, client, demo):
        cartes = client.get("/products?sort=price_desc").json()
        prix = [c["best_open_group_price"] or c["individual_price"] for c in cartes]
        assert prix == sorted(prix, reverse=True)

    def test_filtre_sur_les_groupes_ouverts(self, client, demo):
        cartes = client.get("/products?with_open_groups=true").json()
        assert [c["name"] for c in cartes] == ["Engrais NPK 15-15-15"]
        assert all(c["open_groups_count"] > 0 for c in cartes)

    def test_le_catalogue_reste_public(self, client, demo):
        assert client.get("/products?sort=price_asc").status_code == 200
