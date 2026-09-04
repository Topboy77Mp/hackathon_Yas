"""IA-3 — regroupement des demandes.

La fonctionnalité adresse le seul risque existentiel du modèle : la
fragmentation. Trois groupes de 60 sacs ne débloquent aucun palier, un groupe
de 180 en débloque deux. Ce qui compte est l'interception, pas la finesse du
rapprochement — les tests portent donc d'abord sur la robustesse du repli.
"""

from __future__ import annotations

from conftest import MOT_DE_PASSE, entete, expirer


def acheteur(client, demo) -> dict:
    return entete(client, demo["acheteurs"][0].phone)


class TestPreselectionEtRepli:
    def test_trouve_le_groupe_par_le_nom_du_produit(self, client, demo, sans_ia):
        reponse = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        )
        assert reponse.status_code == 200
        corps = reponse.json()
        assert corps["source"] == "repli"
        assert len(corps["suggestions"]) == 1
        assert corps["suggestions"][0]["group"]["share_code"] == "KOVIE"

    def test_trouve_le_groupe_par_son_propre_nom(self, client, demo, sans_ia):
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "Kovié"}
        ).json()
        assert len(corps["suggestions"]) == 1

    def test_recherche_insensible_a_la_casse(self, client, demo, sans_ia):
        for terme in ["ENGRAIS", "engrais", "EnGrAiS"]:
            corps = client.post(
                "/ai/discover-groups", headers=acheteur(client, demo), json={"query": terme}
            ).json()
            assert len(corps["suggestions"]) == 1, terme

    def test_phrase_en_langage_naturel(self, client, demo, sans_ia):
        """Un utilisateur tape une phrase, pas un mot-clé.

        La présélection cherchait initialement la requête entière comme une
        seule sous-chaîne : « engrais pour mon maïs » ne remontait rien, alors
        que le groupe existait. Les mots sont désormais cherchés un par un.
        """
        for phrase in [
            "engrais pour mon maïs",
            "je cherche de l'engrais",
            "npk 15 15 15",
            "acheter engrais en gros",
        ]:
            corps = client.post(
                "/ai/discover-groups", headers=acheteur(client, demo), json={"query": phrase}
            ).json()
            assert len(corps["suggestions"]) == 1, phrase

    def test_les_mots_trop_courts_sont_ignores(self, client, demo, sans_ia):
        """« de », « du », « le » ne doivent pas ramener tout le catalogue."""
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "de la du"}
        ).json()
        assert corps["suggestions"] == []

    def test_aucune_correspondance(self, client, demo, sans_ia):
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo),
            json={"query": "ordinateur portable"},
        ).json()
        assert corps["suggestions"] == []

    def test_filtre_par_produit(self, client, demo, sans_ia):
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo),
            json={"query": "engrais", "product_id": 9999},
        ).json()
        assert corps["suggestions"] == []

    def test_un_groupe_expire_n_est_jamais_proposé(self, client, demo, session, sans_ia):
        """Proposer de rejoindre un groupe clos serait pire que ne rien proposer."""
        expirer(session, demo["groupe_id"])
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        assert corps["suggestions"] == []

    def test_repli_quand_le_service_tombe(self, client, demo, ia_en_panne):
        """Aucune exception ne remonte : on affiche la présélection SQL."""
        reponse = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        )
        assert reponse.status_code == 200
        assert reponse.json()["source"] == "repli"
        assert len(reponse.json()["suggestions"]) == 1


class TestValidationDesSorties:
    def test_un_identifiant_inventé_est_écarté(self, client, demo, monkeypatch):
        """Un modèle qui invente un identifiant enverrait l'utilisateur nulle part."""
        import ai

        monkeypatch.setattr(ai, "GROQ_API_KEY", "clé-factice")
        monkeypatch.setattr(
            ai, "_call_groq",
            lambda *a, **k: {"matches": [{"group_id": 99999, "score": 0.9, "reason": "x"}]},
        )
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        assert corps["suggestions"] == []

    def test_le_seuil_de_pertinence_est_applique(self, client, demo, monkeypatch):
        import ai

        monkeypatch.setattr(ai, "GROQ_API_KEY", "clé-factice")
        monkeypatch.setattr(
            ai, "_call_groq",
            lambda *a, **k: {
                "matches": [{"group_id": demo["groupe_id"], "score": 0.4, "reason": "vague"}]
            },
        )
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        assert corps["suggestions"] == [], "sous 0,6 la suggestion est écartée"

    def test_trois_resultats_au_maximum(self, client, demo, monkeypatch, session):
        import ai
        from models import Group, GroupStatus, utcnow
        from datetime import timedelta

        for index in range(5):
            session.add(
                Group(
                    creator_id=1, product_id=demo["produit_id"],
                    name=f"Engrais groupe {index}", target_quantity=100, min_quantity=10,
                    deadline=utcnow() + timedelta(hours=24),
                    status=GroupStatus.OPEN, share_code=f"ENG{index:02d}",
                )
            )
        session.commit()

        monkeypatch.setattr(ai, "GROQ_API_KEY", "clé-factice")
        monkeypatch.setattr(
            ai, "_call_groq",
            lambda *a, **k: {
                "matches": [
                    {"group_id": g, "score": 0.9, "reason": "même produit"}
                    for g in range(1, 7)
                ]
            },
        )
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        assert len(corps["suggestions"]) <= 3

    def test_les_suggestions_sont_triees_par_score(self, client, demo, monkeypatch, session):
        import ai
        from datetime import timedelta
        from models import Group, GroupStatus, utcnow

        second = Group(
            creator_id=1, product_id=demo["produit_id"], name="Engrais bis",
            target_quantity=100, min_quantity=10,
            deadline=utcnow() + timedelta(hours=24),
            status=GroupStatus.OPEN, share_code="BIS01",
        )
        session.add(second)
        session.commit()

        monkeypatch.setattr(ai, "GROQ_API_KEY", "clé-factice")
        monkeypatch.setattr(
            ai, "_call_groq",
            lambda *a, **k: {
                "matches": [
                    {"group_id": demo["groupe_id"], "score": 0.7, "reason": "proche"},
                    {"group_id": second.id, "score": 0.95, "reason": "exact"},
                ]
            },
        )
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        scores = [s["score"] for s in corps["suggestions"]]
        assert scores == sorted(scores, reverse=True)

    def test_sortie_illisible_bascule_en_repli(self, client, demo, monkeypatch):
        import ai

        monkeypatch.setattr(ai, "GROQ_API_KEY", "clé-factice")
        monkeypatch.setattr(ai, "_call_groq", lambda *a, **k: {"n'importe": "quoi"})
        corps = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "engrais"}
        ).json()
        assert corps["source"] == "repli"
        assert len(corps["suggestions"]) == 1


class TestAccesEtValidation:
    def test_authentification_requise(self, client, demo, sans_ia):
        assert client.post("/ai/discover-groups", json={"query": "engrais"}).status_code == 401

    def test_requete_trop_courte(self, client, demo, sans_ia):
        reponse = client.post(
            "/ai/discover-groups", headers=acheteur(client, demo), json={"query": "a"}
        )
        assert reponse.status_code == 422

    def test_limitation_de_debit(self, client, demo, sans_ia):
        en_tete = acheteur(client, demo)
        codes = [
            client.post("/ai/discover-groups", headers=en_tete,
                        json={"query": "engrais"}).status_code
            for _ in range(15)
        ]
        assert codes.count(200) == 12
        assert codes[-1] == 429


class TestKpiReussite:
    def test_un_groupe_verrouille_compte_comme_reussi(self, client, demo, session):
        """Sans ce correctif, la page du jury afficherait « 0 % de réussite »."""
        avant = client.get("/stats/impact").json()
        assert avant["groups_successful"] == 0

        expirer(session, demo["groupe_id"])
        client.get(f"/groups/{demo['groupe_id']}")

        apres = client.get("/stats/impact").json()
        assert apres["groups_successful"] == 1
        assert apres["success_rate"] == 1.0
        assert apres["groups_active"] == 0

    def test_un_groupe_annule_ne_compte_pas(self, client, demo, session):
        client.post(
            "/auth/register",
            json={"first_name": "Test", "last_name": "Test",
                  "phone": "+22875000001", "password": MOT_DE_PASSE},
        )
        en_tete = entete(client, "+22875000001")
        cree = client.post(
            "/groups", headers=en_tete,
            json={"product_id": demo["produit_id"], "name": "Échec",
                  "target_quantity": 200, "min_quantity": 100, "quantity": 2},
        ).json()

        expirer(session, cree["id"])
        client.get(f"/groups/{cree['id']}")

        stats = client.get("/stats/impact").json()
        assert stats["groups_successful"] == 0
