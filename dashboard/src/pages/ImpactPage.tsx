import { getImpactStats } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const integer = new Intl.NumberFormat("fr-FR");

export function ImpactPage() {
  const resource = useAsyncResource(getImpactStats, []);
  if (resource.isLoading) return <LoadingState title="Chargement des indicateurs d’impact…" />;
  if (resource.error || !resource.data) return <ErrorState title="Statistiques indisponibles" description={resource.error?.message} retry={resource.retry} />;

  const impact = resource.data;
  const secondaryKpis = [
    [impact.activeGroupsLabel, impact.activeGroups],
    ["Groupes réussis", impact.successfulGroups],
    [impact.audienceLabel, impact.audience],
    ["Unités commandées", impact.orderedUnits],
  ];

  return (
    <section className="impact-page" aria-labelledby="impact-title">
      <div className="page-heading impact-heading">
        <div>
          <div className="eyebrow">Impact de la communauté</div>
          <h1 id="impact-title">Ce que le collectif a rendu possible.</h1>
        </div>
        <span className="data-label">Vue d’ensemble</span>
      </div>

      <article className="hero-kpi">
        <p>Économies générées</p>
        <strong>{integer.format(impact.totalSavings)} FCFA</strong>
        <span>rendues au pouvoir d’achat de la communauté</span>
      </article>

      <div className="kpi-grid">
        {secondaryKpis.map(([label, value]) => (
          <article className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{integer.format(Number(value))}</strong>
          </article>
        ))}
      </div>

      <article className="total-value">
        <span>Valeur totale des commandes groupées</span>
        <strong>{integer.format(impact.totalValue)} FCFA</strong>
      </article>
    </section>
  );
}
