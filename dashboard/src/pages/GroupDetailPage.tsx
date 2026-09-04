import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DemoPanel } from "../components/DemoPanel";
import { ShareBox } from "../components/ShareBox";
import { getGroup, getProduct } from "../lib/api/endpoints";
import { POLL_INTERVAL_MS } from "../lib/config";
import {
  delai,
  entier,
  fcfa,
  libelleStatut,
  pourcentage,
  remise,
  tonStatut,
  unites,
} from "../lib/format";
import { useAsyncResource } from "../lib/useAsyncResource";
import { ErrorState, LoadingState } from "./ResourceState";

export function GroupDetailPage() {
  const { groupId = "" } = useParams();
  const identifiant = Number(groupId);

  const groupe = useAsyncResource(() => getGroup(identifiant), [identifiant], {
    pollMs: POLL_INTERVAL_MS,
  });

  const prixPrecedent = useRef<number | null>(null);
  const [palierFranchi, setPalierFranchi] = useState(false);

  // Le franchissement de palier est l'événement du pitch. Il se produit pendant
  // que la page est ouverte : sans cette détection, le prix changerait sans que
  // personne ne le remarque.
  useEffect(() => {
    const prix = groupe.data?.current_unit_price;
    if (prix === undefined) return;

    if (prixPrecedent.current !== null && prix < prixPrecedent.current) {
      setPalierFranchi(true);
      const minuteur = window.setTimeout(() => setPalierFranchi(false), 6000);
      prixPrecedent.current = prix;
      return () => window.clearTimeout(minuteur);
    }
    prixPrecedent.current = prix;
  }, [groupe.data?.current_unit_price]);

  if (groupe.isLoading) return <LoadingState title="Chargement du groupe…" />;
  if (groupe.error || !groupe.data) {
    return (
      <ErrorState
        title="Groupe indisponible"
        description={groupe.error?.message}
        retry={groupe.refresh}
      />
    );
  }

  const g = groupe.data;
  const progression = pourcentage(g.progress_ratio);
  const unite = g.product.unit_label;

  return (
    <section className="dashboard-page" aria-labelledby="group-title">
      <div className="page-heading compact-heading">
        <div>
          <div className="eyebrow">Groupe d’achat</div>
          <h1 id="group-title">{g.name}</h1>
          <p className="page-intro">
            {g.product.name} · code de partage <strong>{g.share_code}</strong>
          </p>
        </div>
        <span className={`status status-${tonStatut(g.status)}`}>
          {libelleStatut(g.status)}
        </span>
      </div>

      {palierFranchi && (
        <p className="unlock-banner" role="status">
          Palier débloqué — le nouveau prix s’applique rétroactivement à toutes les
          commandes du groupe.
        </p>
      )}

      <div className="group-layout">
        <div className="group-column">
          <article className="group-summary">
            <div className="group-number">
              <strong>{entier(g.current_quantity)}</strong>
              <span>/ {unites(g.target_quantity, unite)}</span>
            </div>

            <div
              className="progress-track"
              role="img"
              aria-label={`${progression} pour cent de l’objectif atteint`}
            >
              <span style={{ width: `${progression}%` }} />
            </div>

            <p>
              <strong>{entier(g.participants_count)} participants</strong> ·{" "}
              {g.quantity_to_next_tier === null
                ? "le dernier palier est atteint."
                : `il manque ${unites(g.quantity_to_next_tier, unite)} pour débloquer le prochain prix.`}
            </p>

            <div className="price-comparison">
              <div>
                <span>Prix en vigueur</span>
                <strong>{fcfa(g.current_unit_price)}</strong>
              </div>
              <div>
                <span>Au prochain palier</span>
                <strong>
                  {g.next_tier === null ? "Palier maximal" : fcfa(g.next_tier.unit_price)}
                </strong>
              </div>
            </div>

            <div className="saving-strip">
              <div>
                <span>Économie par {unite}</span>
                <strong>{fcfa(g.unit_saving)}</strong>
              </div>
              <div>
                <span>Économie du groupe</span>
                <strong>{fcfa(g.group_total_saving)}</strong>
              </div>
              <div>
                <span>Minimum à atteindre</span>
                <strong>{unites(g.min_quantity, unite)}</strong>
              </div>
            </div>
          </article>

          <TierGrid
            currentMinQuantity={g.current_tier.min_quantity}
            productId={g.product.id}
            retailPrice={g.product.individual_price}
            unitLabel={unite}
          />
        </div>

        <aside className="group-column">
          <div className="group-aside">
            <span className="aside-kicker">Clôture</span>
            <strong>{delai(g.seconds_remaining)}</strong>
            <p>
              {g.status === "OPEN"
                ? `Sous le minimum de ${unites(g.min_quantity, unite)} à l’échéance, le groupe est annulé et les commandes remboursées.`
                : "Le groupe n’accepte plus de nouvelles commandes."}
            </p>
            <Link className="text-link" to="/offres">Retour à mes offres</Link>
          </div>

          <ShareBox groupId={g.id} />

          {g.status === "OPEN" && (
            <DemoPanel
              groupId={g.id}
              onSimulated={groupe.refresh}
              unitLabel={unite}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

/**
 * Grille complète du produit, avec le palier en vigueur mis en évidence.
 * `GroupDetail` ne porte que le palier courant et le suivant : la grille entière
 * vient de la fiche produit.
 */
function TierGrid({
  productId,
  retailPrice,
  currentMinQuantity,
  unitLabel,
}: {
  productId: number;
  retailPrice: number;
  currentMinQuantity: number;
  unitLabel: string;
}) {
  const produit = useAsyncResource(() => getProduct(productId), [productId]);
  if (!produit.data || produit.data.tiers.length === 0) return null;

  return (
    <article className="tier-editor">
      <h2>Grille de prix</h2>
      <div className="tier-table" role="table" aria-label="Paliers de prix du produit">
        <div className="tier-row tier-head" role="row">
          <span>Palier</span>
          <span>À partir de</span>
          <span>Prix unitaire</span>
          <span>Remise</span>
        </div>
        {produit.data.tiers.map((palier, index) => {
          const actif = palier.min_quantity === currentMinQuantity;
          const pourcent = remise(retailPrice, palier.unit_price);
          return (
            <div
              className={actif ? "tier-row tier-current" : "tier-row"}
              key={palier.min_quantity}
              role="row"
            >
              <span>
                Palier {index + 1}
                {actif && <span className="tier-flag"> · en vigueur</span>}
              </span>
              <span>{unites(palier.min_quantity, unitLabel)}</span>
              <span>{fcfa(palier.unit_price)}</span>
              <span className={pourcent > 0 ? "tier-best" : ""}>
                {pourcent <= 0 ? "Prix détail" : `−${pourcent} %`}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
