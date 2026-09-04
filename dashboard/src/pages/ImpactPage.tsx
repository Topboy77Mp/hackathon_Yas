import { getImpact } from "../lib/api/endpoints";
import { entier, fcfa } from "../lib/format";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

/**
 * Page d'impact — publique, c'est celle que le jury regarde.
 *
 * Elle se rafraîchit toute seule : quand le simulateur fait franchir un palier
 * dans un autre onglet, les économies communautaires montent sous les yeux du
 * public sans que personne n'ait à recharger.
 */
export function ImpactPage() {
  const resource = useAsyncResource(getImpact, [], { pollMs: 5000 });

  if (resource.isLoading) return <LoadingState title="Chargement des indicateurs…" />;
  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Statistiques indisponibles"
        description={resource.error?.message}
        retry={resource.refresh}
      />
    );
  }

  const impact = resource.data;
  const tauxReussite = Math.round(impact.success_rate * 100);

  const indicateurs: Array<[string, string]> = [
    ["Groupes ouverts", entier(impact.groups_active)],
    ["Groupes réussis", entier(impact.groups_successful)],
    ["Taux de réussite", `${tauxReussite} %`],
    ["Acheteurs inscrits", entier(impact.users)],
    ["Commerçants partenaires", entier(impact.merchants)],
    ["Offres au catalogue", entier(impact.products)],
    ["Commandes passées", entier(impact.orders)],
    ["Unités commandées", entier(impact.units_ordered)],
  ];

  return (
    <section className="impact-page" aria-labelledby="impact-title">
      <div className="eyebrow">Impact de la communauté</div>
      <h1 id="impact-title">Ensemble, nous achetons mieux.</h1>

      <article className="hero-kpi">
        <p>Économies générées</p>
        <strong>{fcfa(impact.community_savings)}</strong>
        <span>rendues au pouvoir d’achat de la communauté</span>
      </article>

      <div className="kpi-grid">
        {indicateurs.map(([libelle, valeur]) => (
          <article className="kpi-card" key={libelle}>
            <span>{libelle}</span>
            <strong>{valeur}</strong>
          </article>
        ))}
      </div>

      <article className="total-value">
        <span>Valeur totale des commandes groupées</span>
        <strong>{fcfa(impact.total_order_value)}</strong>
      </article>
    </section>
  );
}
