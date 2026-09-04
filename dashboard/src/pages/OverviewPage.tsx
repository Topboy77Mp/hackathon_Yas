import { Link } from "react-router-dom";
import { getImpactStats, getMerchantDashboard } from "../lib/dashboardData";
import { USE_MOCKS } from "../lib/config";
import { useAsyncResource } from "../lib/useAsyncResource";
import { DashboardIcon } from "./DashboardIcon";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

export function OverviewPage() {
  const merchant = useAsyncResource(getMerchantDashboard, []);
  const impact = useAsyncResource(getImpactStats, []);

  if (merchant.isLoading) return <LoadingState title="Chargement de votre espace…" />;
  if (merchant.error || !merchant.data) return <ErrorState description={merchant.error?.message} retry={merchant.retry} title="Espace commerçant indisponible" />;

  const dashboard = merchant.data;
  const group = dashboard.rows[0];
  const kpis = [
    { icon: "users" as const, label: "Groupes actifs", value: dashboard.groups },
    { icon: "cart" as const, label: "Commandes", value: dashboard.units },
    { icon: "chart" as const, label: "Chiffre d’affaires", value: `${amount.format(dashboard.revenue)} FCFA` },
    { icon: "card" as const, label: "Économies communauté", value: impact.data ? `${amount.format(impact.data.totalSavings)} FCFA` : "…" },
  ];
  const offers = USE_MOCKS && dashboard.rows.length === 1
    ? [group, { ...group, groupId: "urea", productName: "Urée 46%", currentQuantity: 85, targetQuantity: 150, participants: 24 }, { ...group, groupId: "lambda", productName: "Pesticide Lambda 25EC", currentQuantity: 50, targetQuantity: 100, participants: 16 }]
    : dashboard.rows;

  return (
    <section className="overview-page" aria-labelledby="overview-title">
      <div className="overview-actions">
        <Link className="button button-primary" to="/offres/nouvelle"><DashboardIcon name="plus" />Créer une offre</Link>
      </div>
      <h1 className="sr-only" id="overview-title">Vue d’ensemble</h1>

      <div className="overview-kpis">
        {kpis.map((kpi) => <article className="overview-kpi" key={kpi.label}>
          <span className="kpi-icon"><DashboardIcon name={kpi.icon} size={26} /></span>
          <div><span>{kpi.label}</span><strong>{kpi.value}</strong></div>
        </article>)}
      </div>

      {group && <article className="overview-group">
        <h2>Groupe en progression</h2>
        <div className="group-preview">
          <div className="product-bag"><span>NPK</span><strong>15-15-15</strong><small>50 kg</small></div>
          <div className="group-preview-main">
            <h3>{group.productName}</h3>
            <p><strong>{group.currentQuantity}</strong> / {group.targetQuantity} sacs</p>
            <div className="overview-progress"><span style={{ width: `${Math.round((group.currentQuantity / group.targetQuantity) * 100)}%` }} /></div>
            <div className="group-prices"><div><span>Palier actuel</span><strong>{amount.format(group.currentUnitPrice)} FCFA</strong></div><div><span>Prochain palier</span><strong>17 500 FCFA</strong></div></div>
          </div>
          <Link className="button button-secondary" to={`/groupes/${group.groupId}`}>Voir le groupe<DashboardIcon name="chevron" /></Link>
        </div>
      </article>}

      <article className="recent-offers">
        <div className="section-heading"><h2>Offres récentes</h2><Link to="/offres">Voir toutes les offres<DashboardIcon name="chevron" /></Link></div>
        <div className="offer-table" role="table" aria-label="Offres récentes">
          <div className="offer-table-row offer-table-head" role="row"><span>Produit</span><span>Progression</span><span>Statut</span><span>Actions</span></div>
          {offers.map((offer) => {
            const progress = Math.round((offer.currentQuantity / offer.targetQuantity) * 100);
            return <div className="offer-table-row" key={offer.groupId} role="row">
              <span className="table-product"><span className="mini-product">NPK</span>{offer.productName}</span>
              <span className="table-progress"><span>{offer.currentQuantity} / {offer.targetQuantity} sacs</span><i><b style={{ width: `${progress}%` }} /></i><em>{progress} %</em></span>
              <span className="status status-active">Actif</span>
              <span className="table-actions"><Link aria-label={`Voir ${offer.productName}`} to={`/groupes/${offer.groupId}`}><DashboardIcon name="eye" /></Link><Link aria-label={`Analyser ${offer.productName}`} to="/impact"><DashboardIcon name="chart" /></Link><button aria-label={`Plus d’actions pour ${offer.productName}`} type="button"><DashboardIcon name="more" /></button></span>
            </div>;
          })}
        </div>
      </article>
    </section>
  );
}
