import { Link } from "react-router-dom";
import { getMerchantDashboard } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

export function OffersPage() {
  const resource = useAsyncResource(getMerchantDashboard, []);
  if (resource.isLoading) return <LoadingState title="Chargement de vos offres…" />;
  if (resource.error || !resource.data) return <ErrorState title="Offres indisponibles" description={resource.error?.message} retry={resource.retry} />;

  const dashboard = resource.data;
  return (
    <section className="dashboard-page" aria-labelledby="offers-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Espace commerçant</div>
          <h1 id="offers-title">Mes offres</h1>
          <p className="page-intro">{dashboard.businessName} · vos groupes en cours et leur volume engagé.</p>
        </div>
        <Link className="button button-primary" to="/offres/nouvelle">Créer une offre</Link>
      </div>

      <div className="merchant-summary" aria-label="Synthèse de l’activité">
        <div><span>Commandes</span><strong>{amount.format(dashboard.orders)}</strong></div>
        <div><span>Unités réservées</span><strong>{amount.format(dashboard.units)}</strong></div>
        <div><span>Valeur engagée</span><strong>{amount.format(dashboard.revenue)} FCFA</strong></div>
        <div><span>En attente</span><strong>{amount.format(dashboard.pendingOrders)}</strong></div>
      </div>

      <div className="offer-grid">
        {dashboard.rows.map((group) => (
          <article className="offer-card" key={group.groupId}>
            <div className="card-topline">
              <span className="status status-active">{group.status === "OPEN" ? "Ouvert" : group.status}</span>
              <span className="muted">{group.participants} participants</span>
            </div>
            <h2>{group.productName}</h2>
            <p>{group.groupName}</p>
            <div className="card-progress" aria-label={`${group.currentQuantity} unités sur ${group.targetQuantity}`}>
              <span style={{ width: `${Math.round((group.currentQuantity / group.targetQuantity) * 100)}%` }} />
            </div>
            <span className="card-progress-label">{amount.format(group.currentQuantity)} / {amount.format(group.targetQuantity)} unités</span>
            <div className="offer-metric">
              <strong>{amount.format(group.totalAmount)} FCFA</strong>
              <span>valeur engagée · prix actuel {amount.format(group.currentUnitPrice)} FCFA</span>
            </div>
            <div className="card-actions">
              <Link className="button button-secondary" to={`/groupes/${group.groupId}`}>Voir le groupe</Link>
            </div>
          </article>
        ))}
        {dashboard.rows.length === 0 && <article className="empty-offers"><h2>Aucun groupe actif pour le moment.</h2><p>Créez une offre avec paliers pour lancer le premier achat groupé.</p><Link className="button button-primary" to="/offres/nouvelle">Créer une offre</Link></article>}
      </div>
    </section>
  );
}
