import { Link } from "react-router-dom";
import { getMerchantDashboard, getMerchantProducts } from "../lib/api/endpoints";
import { entier, fcfa, libelleStatut, pourcentage, tonStatut, unites } from "../lib/format";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

/**
 * Deux choses distinctes vivent sur cette page, et les confondre était le défaut
 * de la version précédente : les **offres** (produits et leur grille de paliers)
 * et les **groupes** (achats en cours sur ces offres). Un commerçant qui vient de
 * publier un produit n'a aucun groupe — il devait quand même voir son offre.
 */
export function OffersPage() {
  const offres = useAsyncResource(getMerchantProducts, []);
  const tableau = useAsyncResource(getMerchantDashboard, []);

  if (offres.isLoading || tableau.isLoading) {
    return <LoadingState title="Chargement de votre espace…" />;
  }
  if (offres.error || !offres.data) {
    return (
      <ErrorState
        title="Espace indisponible"
        description={offres.error?.message}
        retry={offres.refresh}
      />
    );
  }

  const produits = offres.data;
  const bord = tableau.data;

  return (
    <section className="dashboard-page" aria-labelledby="offers-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Espace commerçant</div>
          <h1 id="offers-title">{bord?.business_name ?? "Mes offres"}</h1>
          <p className="page-intro">
            Vos produits, leur grille de paliers et les groupes d’achat en cours.
          </p>
        </div>
        <Link className="button button-primary" to="/offres/nouvelle">Créer une offre</Link>
      </div>

      {bord && (
        <div className="summary-strip">
          <div><span>Chiffre d’affaires engagé</span><strong>{fcfa(bord.revenue_simule)}</strong></div>
          <div><span>Unités réservées</span><strong>{entier(bord.units)}</strong></div>
          <div><span>Commandes</span><strong>{entier(bord.orders)}</strong></div>
          <div><span>Groupes actifs</span><strong>{entier(bord.groups)}</strong></div>
        </div>
      )}

      <h2 className="section-heading">Mes offres</h2>
      <div className="offer-grid">
        {produits.map((produit) => (
          <article className="offer-card" key={produit.id}>
            <div className="card-topline">
              <span className={`status status-${tonStatut(produit.status)}`}>
                {libelleStatut(produit.status)}
              </span>
              <span className="muted">
                {unites(produit.stock, produit.unit_label)} en stock
              </span>
            </div>

            <h3>{produit.name}</h3>
            <p>
              Prix de détail {fcfa(produit.individual_price)}
              {produit.tiers.length > 0 && <> · meilleur prix {fcfa(produit.best_price)}</>}
            </p>

            {produit.tiers.length > 0 ? (
              <ul className="tier-chips">
                {produit.tiers.map((palier) => (
                  <li key={palier.min_quantity}>
                    <strong>{entier(palier.min_quantity)}+</strong> {fcfa(palier.unit_price)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="warning-note">
                Sans grille de paliers, cette offre reste un brouillon et n’apparaît pas au catalogue.
              </p>
            )}

            <div className="offer-metric">
              <strong>{unites(produit.reserved_units, produit.unit_label)} réservés</strong>
              <span>
                {produit.groups_count === 0
                  ? "aucun groupe ouvert"
                  : `${produit.groups_count} groupe${produit.groups_count > 1 ? "s" : ""} sur cette offre`}
              </span>
            </div>

            <div className="card-actions">
              <Link className="button button-secondary" to={`/offres/${produit.id}/paliers`}>
                {produit.tiers.length > 0 ? "Modifier les paliers" : "Ajouter des paliers"}
              </Link>
            </div>
          </article>
        ))}

        {produits.length === 0 && (
          <article className="empty-offers">
            <h3>Aucune offre publiée.</h3>
            <p>Créez une offre avec sa grille de paliers pour lancer le premier achat groupé.</p>
            <Link className="button button-primary" to="/offres/nouvelle">Créer une offre</Link>
          </article>
        )}
      </div>

      <h2 className="section-heading">Groupes en cours</h2>
      {tableau.error && !bord && (
        <p className="warning-note">
          Les groupes n’ont pas pu être chargés. {tableau.error.message}
        </p>
      )}

      <div className="group-rows">
        {bord?.rows.map((ligne) => (
          <Link className="group-row" key={ligne.group_id} to={`/groupes/${ligne.group_id}`}>
            <div className="group-row-main">
              <div className="card-topline">
                <span className={`status status-${tonStatut(ligne.status)}`}>
                  {libelleStatut(ligne.status)}
                </span>
                <span className="muted">{entier(ligne.participants_count)} participants</span>
              </div>
              <h3>{ligne.group_name}</h3>
              <p>{ligne.product_name}</p>
              <div
                className="progress-track"
                role="img"
                aria-label={`${pourcentage(ligne.current_quantity / ligne.target_quantity)} % de l’objectif`}
              >
                <span
                  style={{
                    width: `${pourcentage(ligne.current_quantity / ligne.target_quantity)}%`,
                  }}
                />
              </div>
              <p className="muted">
                {entier(ligne.current_quantity)} / {entier(ligne.target_quantity)} unités engagées
              </p>
            </div>
            <div className="group-row-metric">
              <span>Prix en vigueur</span>
              <strong>{fcfa(ligne.current_unit_price)}</strong>
              <span>{fcfa(ligne.total_amount)} engagés</span>
            </div>
          </Link>
        ))}

        {bord?.rows.length === 0 && (
          <p className="muted">
            Aucun groupe d’achat n’est encore ouvert sur vos offres.
          </p>
        )}
      </div>
    </section>
  );
}
