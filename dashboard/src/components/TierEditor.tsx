import { fcfa, pluriel, remise, unites } from "../lib/format";
import { paliersuivant, type EditableTier } from "../lib/tiers";

interface Props {
  tiers: EditableTier[];
  onChange: (tiers: EditableTier[]) => void;
  retailPrice: number;
  stock: number;
  unitLabel: string;
  errors: string[];
}

/**
 * Éditeur de grille partagé par la création d'offre et la modification des paliers.
 *
 * La remise se calcule contre le prix de détail **saisi**, pas contre une
 * constante : la version précédente divisait par 22 000 en dur, ce qui affichait
 * des remises fantaisistes dès qu'on changeait de produit.
 */
export function TierEditor({
  tiers,
  onChange,
  retailPrice,
  stock,
  unitLabel,
  errors,
}: Props) {
  function modifier(id: string, champ: "minQuantity" | "unitPrice", valeur: string) {
    const nombre = Number(valeur);
    onChange(
      tiers.map((tier) =>
        tier.id === id ? { ...tier, [champ]: Number.isFinite(nombre) ? nombre : 0 } : tier,
      ),
    );
  }

  function retirer(id: string) {
    onChange(tiers.filter((tier) => tier.id !== id));
  }

  return (
    <div className="tier-editor">
      <div className="section-title-row">
        <div>
          <h2>Grille des paliers</h2>
          <p>Le prix baisse à mesure que le volume total commandé augmente.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => onChange([...tiers, paliersuivant(tiers, stock)])}
          type="button"
        >
          + Ajouter un palier
        </button>
      </div>

      <div className="tier-table" role="table" aria-label="Paliers de prix">
        <div className="tier-row tier-head" role="row">
          <span>Palier</span>
          <span>À partir de</span>
          <span>Prix unitaire</span>
          <span>Remise</span>
          <span aria-hidden="true" />
        </div>

        {tiers.map((tier, index) => {
          const pourcent = remise(retailPrice, tier.unitPrice);
          return (
            <div className="tier-row" key={tier.id} role="row">
              <span>Palier {index + 1}</span>

              <label>
                <input
                  aria-label={`Quantité minimale du palier ${index + 1}`}
                  min="1"
                  onChange={(event) => modifier(tier.id, "minQuantity", event.target.value)}
                  type="number"
                  value={tier.minQuantity}
                />
                <span className="unit">{pluriel(tier.minQuantity, unitLabel)}</span>
              </label>

              <label>
                <input
                  aria-label={`Prix unitaire du palier ${index + 1}`}
                  min="1"
                  onChange={(event) => modifier(tier.id, "unitPrice", event.target.value)}
                  type="number"
                  value={tier.unitPrice}
                />
                <span className="unit">FCFA</span>
              </label>

              <span className={pourcent > 0 && index === tiers.length - 1 ? "tier-best" : ""}>
                {pourcent <= 0 ? "Prix détail" : `−${pourcent} %`}
              </span>

              <span>
                {tiers.length > 1 && (
                  <button
                    aria-label={`Supprimer le palier ${index + 1}`}
                    className="button button-ghost"
                    onClick={() => retirer(tier.id)}
                    type="button"
                  >
                    Supprimer
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {errors.length > 0 && (
        <ul className="tier-errors" role="alert">
          {errors.map((erreur) => (
            <li key={erreur}>{erreur}</li>
          ))}
        </ul>
      )}

      <p className="muted">
        Meilleur prix de la grille : {fcfa(Math.min(...tiers.map((t) => t.unitPrice)))} ·
        stock disponible {unites(stock, unitLabel)}
      </p>
    </div>
  );
}
