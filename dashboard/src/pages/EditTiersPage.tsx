import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TierEditor } from "../components/TierEditor";
import { getMerchantProducts, replaceTiers, suggestTiers } from "../lib/api/endpoints";
import { fcfa, unites } from "../lib/format";
import {
  grilleParDefaut,
  tierFromApi,
  toApiTiers,
  validateTiers,
  type EditableTier,
} from "../lib/tiers";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

/**
 * Modification de la grille d'une offre existante.
 *
 * C'est ce qui rend un brouillon publiable : un produit créé sans paliers
 * n'apparaît pas au catalogue tant qu'on ne lui en donne pas.
 */
export function EditTiersPage() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const identifiant = Number(productId);

  const resource = useAsyncResource(getMerchantProducts, [identifiant]);
  const produit = resource.data?.find((row) => row.id === identifiant) ?? null;

  const [tiers, setTiers] = useState<EditableTier[] | null>(null);
  const [enSuggestion, setEnSuggestion] = useState(false);
  const [enEnvoi, setEnEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!produit || tiers !== null) return;
    setTiers(
      produit.tiers.length > 0
        ? tierFromApi(produit.tiers)
        : grilleParDefaut(produit.individual_price, produit.stock),
    );
  }, [produit, tiers]);

  const erreursGrille = useMemo(
    () => (tiers && produit ? validateTiers(tiers, produit.stock) : []),
    [tiers, produit],
  );

  if (resource.isLoading) return <LoadingState title="Chargement de l’offre…" />;
  if (resource.error) {
    return (
      <ErrorState
        title="Offre indisponible"
        description={resource.error.message}
        retry={resource.refresh}
      />
    );
  }
  if (!produit) {
    return (
      <ErrorState
        title="Offre introuvable"
        description="Cette offre n’existe pas ou ne vous appartient pas."
      />
    );
  }
  if (!tiers) return <LoadingState title="Préparation de la grille…" />;

  async function proposer() {
    if (!produit) return;
    setEnSuggestion(true);
    setErreur(null);
    try {
      const reponse = await suggestTiers({
        product_name: produit.name,
        retail_price: produit.individual_price,
        stock: produit.stock,
      });
      setTiers(
        reponse.tiers.map((tier, index) => ({
          id: `suggestion-${index + 1}`,
          minQuantity: tier.min_quantity,
          unitPrice: tier.unit_price,
        })),
      );
    } catch (reason) {
      setErreur(reason instanceof Error ? reason.message : "Suggestion indisponible.");
    } finally {
      setEnSuggestion(false);
    }
  }

  async function enregistrer() {
    if (!tiers || erreursGrille.length > 0) return;
    setEnEnvoi(true);
    setErreur(null);
    try {
      await replaceTiers(identifiant, toApiTiers(tiers));
      navigate("/offres", { replace: true });
    } catch (reason) {
      setErreur(
        reason instanceof Error ? reason.message : "Impossible d’enregistrer la grille.",
      );
    } finally {
      setEnEnvoi(false);
    }
  }

  return (
    <section className="dashboard-page" aria-labelledby="tiers-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Grille de paliers</div>
          <h1 id="tiers-title">{produit.name}</h1>
          <p className="page-intro">
            Prix de détail {fcfa(produit.individual_price)} · stock{" "}
            {unites(produit.stock, produit.unit_label)}
          </p>
        </div>
        <button
          className="button button-secondary"
          disabled={enSuggestion}
          onClick={proposer}
          type="button"
        >
          {enSuggestion ? "Analyse…" : "Proposer une grille"}
        </button>
      </div>

      {produit.status === "DRAFT" && (
        <p className="warning-note">
          Cette offre est un brouillon : elle n’apparaîtra au catalogue qu’une fois une
          grille valide enregistrée.
        </p>
      )}

      <TierEditor
        errors={erreursGrille}
        onChange={setTiers}
        retailPrice={produit.individual_price}
        stock={produit.stock}
        tiers={tiers}
        unitLabel={produit.unit_label}
      />

      <div className="form-actions">
        <button
          className="button button-primary"
          disabled={enEnvoi || erreursGrille.length > 0}
          onClick={enregistrer}
          type="button"
        >
          {enEnvoi ? "Enregistrement…" : "Enregistrer la grille"}
        </button>
        <Link className="text-link" to="/offres">Annuler</Link>
      </div>

      {erreur && <p className="form-error" role="alert">{erreur}</p>}
    </section>
  );
}
