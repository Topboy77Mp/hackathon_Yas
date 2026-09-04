import { Link, useParams } from "react-router-dom";
import { getMerchantGroup } from "../lib/dashboardData";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

const amount = new Intl.NumberFormat("fr-FR");

export function GroupDetailPage() {
  const { groupId = "kov-2026" } = useParams();
  const resource = useAsyncResource(() => getMerchantGroup(groupId), [groupId]);
  if (resource.isLoading) return <LoadingState title="Chargement du groupe…" />;
  if (resource.error || !resource.data) return <ErrorState title="Groupe indisponible" description={resource.error?.message} retry={resource.retry} />;

  const group = resource.data;
  const progress = Math.round(group.progressRatio * 100);

  return (
    <section className="dashboard-page" aria-labelledby="group-title">
      <div className="page-heading compact-heading">
        <div>
          <div className="eyebrow">Groupe actif</div>
          <h1 id="group-title">{group.name}</h1>
          <p className="page-intro">{group.productName}</p>
        </div>
        <span className="status status-active">Ouvert</span>
      </div>

      <div className="group-layout">
        <article className="group-summary">
          <div className="group-number"><strong>{group.currentQuantity}</strong><span>/ {group.targetQuantity} sacs</span></div>
          <div className="progress-track" aria-label={`${progress} pour cent de l'objectif atteint`}><span style={{ width: `${progress}%` }} /></div>
          <p><strong>{group.participants} participants</strong> · {group.quantityToNextTier === null ? "le dernier palier est atteint." : `il manque ${group.quantityToNextTier} sacs pour débloquer le prochain prix.`}</p>
          <div className="price-comparison">
            <div><span>Prix actuel</span><strong>{amount.format(group.currentPrice)} FCFA</strong></div>
            <div><span>Au prochain palier</span><strong>{group.nextPrice === null ? "Palier maximal" : `${amount.format(group.nextPrice)} FCFA`}</strong></div>
          </div>
        </article>
        <aside className="group-aside">
          <span className="aside-kicker">Clôture</span>
          <strong>{group.deadlineLabel}</strong>
          <p>Partagez le lien pour accélérer le déblocage du dernier palier.</p>
          <button className="button button-primary" type="button">Copier le lien de partage</button>
          <Link className="text-link" to="/offres">Retour à mes offres</Link>
        </aside>
      </div>
    </section>
  );
}
