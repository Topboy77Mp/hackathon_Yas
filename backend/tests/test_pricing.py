"""Tests du moteur de paliers.

`pricing.py` est le cœur du produit : fonction pure, sans base ni réseau.
Le contrat désigne ce module comme la seule chose à tester en Phase 3.
Les valeurs de référence sont celles du jeu de démonstration.
"""

from __future__ import annotations

import pytest

import pricing

# Engrais NPK 15-15-15, prix de détail 22 000 FCFA, stock 600.
PALIERS = [
    pricing.Tier(1, 49, 22000),
    pricing.Tier(50, 99, 20500),
    pricing.Tier(100, 199, 19000),
    pricing.Tier(200, None, 17500),
]


class TestPalierApplicable:
    @pytest.mark.parametrize(
        "quantite, prix_attendu",
        [
            (0, 22000),    # groupe vide : prix de détail, pas une erreur
            (1, 22000),
            (49, 22000),   # dernière quantité du premier palier
            (50, 20500),   # bascule exacte
            (99, 20500),
            (100, 19000),
            (146, 19000),  # état de départ de la démonstration
            (199, 19000),
            (200, 17500),  # objectif de la démonstration
            (201, 17500),
            (5000, 17500), # au-delà du dernier seuil, le prix ne bouge plus
        ],
    )
    def test_bascule_aux_seuils(self, quantite, prix_attendu):
        assert pricing.current_tier(PALIERS, quantite).unit_price == prix_attendu

    def test_ordre_des_paliers_indifferent(self):
        melange = [PALIERS[2], PALIERS[0], PALIERS[3], PALIERS[1]]
        assert pricing.current_tier(melange, 146).unit_price == 19000

    def test_grille_vide_refusee(self):
        with pytest.raises(ValueError):
            pricing.current_tier([], 10)


class TestPalierSuivant:
    @pytest.mark.parametrize(
        "quantite, seuil_attendu, manque_attendu",
        [
            (0, 50, 50),
            (146, 200, 54),   # « il manque 54 sacs », le chiffre du contrat
            (199, 200, 1),
            (200, None, None),  # meilleur palier atteint
        ],
    )
    def test_seuil_et_reste(self, quantite, seuil_attendu, manque_attendu):
        suivant = pricing.next_tier(PALIERS, quantite)
        assert (suivant.min_quantity if suivant else None) == seuil_attendu
        assert pricing.quantity_to_next_tier(PALIERS, quantite) == manque_attendu


class TestEconomies:
    def test_economie_unitaire(self):
        assert pricing.unit_saving(22000, 19000) == 3000
        assert pricing.unit_saving(22000, 17500) == 4500

    def test_jamais_negative(self):
        """Un palier au-dessus du prix de détail ne crée pas d'économie négative."""
        assert pricing.unit_saving(22000, 25000) == 0

    def test_economie_du_groupe_au_depart(self):
        assert pricing.group_total_saving(22000, 19000, 146) == 438_000

    def test_economie_du_groupe_a_objectif(self):
        """900 000 FCFA : le chiffre que le jury doit retenir."""
        assert pricing.group_total_saving(22000, 17500, 200) == 900_000


class TestProgression:
    @pytest.mark.parametrize(
        "quantite, attendu", [(0, 0.0), (100, 0.5), (146, 0.73), (200, 1.0), (250, 1.0)]
    )
    def test_ratio_borne(self, quantite, attendu):
        assert pricing.progress_ratio(quantite, 200) == pytest.approx(attendu, abs=0.005)

    def test_objectif_nul_ne_divise_pas_par_zero(self):
        assert pricing.progress_ratio(10, 0) == 0.0


class TestInstantane:
    def test_etat_de_depart_de_la_demonstration(self):
        instantane = pricing.compute(PALIERS, 146, 22000, 200)
        assert instantane.current_unit_price == 19000
        assert instantane.next_tier.unit_price == 17500
        assert instantane.quantity_to_next_tier == 54
        assert instantane.unit_saving == 3000
        assert instantane.potential_unit_saving == 4500
        assert instantane.group_total_saving == 438_000

    def test_apres_franchissement(self):
        instantane = pricing.compute(PALIERS, 200, 22000, 200)
        assert instantane.current_unit_price == 17500
        assert instantane.next_tier is None
        assert instantane.quantity_to_next_tier is None
        assert instantane.group_total_saving == 900_000
        assert instantane.progress_ratio == 1.0


class TestValidationDesGrilles:
    def test_grille_de_reference_valide(self):
        assert pricing.validate_tiers(PALIERS, stock=600) == []

    def test_prix_qui_monte_avec_le_volume(self):
        """Le cas explicitement interdit par le cahier des charges."""
        mauvaise = [pricing.Tier(1, 20, 20000), pricing.Tier(21, None, 21000)]
        erreurs = pricing.validate_tiers(mauvaise)
        assert any("baisser" in e for e in erreurs)

    def test_chevauchement(self):
        mauvaise = [pricing.Tier(1, 60, 22000), pricing.Tier(50, None, 20000)]
        assert any("Chevauchement" in e for e in pricing.validate_tiers(mauvaise))

    def test_dernier_palier_ferme(self):
        mauvaise = [pricing.Tier(1, 49, 22000), pricing.Tier(50, 99, 20000)]
        assert any("ouvert" in e for e in pricing.validate_tiers(mauvaise))

    def test_seuils_identiques(self):
        mauvaise = [pricing.Tier(50, 99, 22000), pricing.Tier(50, None, 20000)]
        assert any("seuil" in e for e in pricing.validate_tiers(mauvaise))

    def test_dernier_seuil_au_dessus_du_stock(self):
        erreurs = pricing.validate_tiers(PALIERS, stock=150)
        assert any("stock" in e for e in erreurs)

    def test_grille_vide(self):
        assert pricing.validate_tiers([]) == ["Il faut au moins un palier."]
