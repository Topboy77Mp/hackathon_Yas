import { useState, type MouseEvent } from "react";
import { fcfa, pluriel, remise, unites } from "../lib/format";
import { paliersuivant, type EditableTier } from "../lib/tiers";
import { suggestTiers } from "../lib/api/endpoints";
import { isDemo } from "../lib/demo";

interface Props {
  tiers: EditableTier[];
  onChange: (tiers: EditableTier[]) => void;
  retailPrice: number;
  stock: number;
  unitLabel: string;
  errors: string[];
  productName?: string;
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
  productName,
}: Props) {
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("");

  async function proposer(event: MouseEvent<HTMLButtonElement>) {
    if (retailPrice <= 0 || stock <= 0) return;
    const formName = (event.currentTarget.closest("form")?.elements.namedItem("name") as HTMLInputElement | null)?.value;
    const assistantProductName = productName?.trim() || formName?.trim() || "Produit";
    setAssistantBusy(true);
    setAssistantMessage("");
    try {
      const suggestions = isDemo()
        ? [
            { min_quantity: 1, unit_price: retailPrice },
            { min_quantity: Math.max(2, Math.round(stock * 0.25)), unit_price: Math.max(1, Math.round(retailPrice * 0.94)) },
            { min_quantity: Math.max(3, Math.round(stock * 0.5)), unit_price: Math.max(1, Math.round(retailPrice * 0.88)) },
          ]
        : (await suggestTiers({ product_name: assistantProductName, retail_price: retailPrice, stock })).tiers;
      const uniques = suggestions.filter((tier, index, list) => index === list.findIndex((item) => item.min_quantity === tier.min_quantity));
      onChange(uniques.map((tier, index) => ({ id: `assistant-${Date.now()}-${index}`, minQuantity: tier.min_quantity, unitPrice: tier.unit_price })));
      setAssistantMessage(isDemo() ? "Proposition de démonstration appliquée. Vous pouvez la modifier." : "Proposition appliquée. Vérifiez-la avant l’enregistrement.");
    } catch (reason) {
      setAssistantMessage(reason instanceof Error ? reason.message : "L’assistant est momentanément indisponible.");
    } finally {
      setAssistantBusy(false);
    }
  }
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
        <div className="tier-actions">
          <button className="button button-ai" disabled={assistantBusy || retailPrice <= 0 || stock <= 0} onClick={proposer} type="button">{assistantBusy ? "Préparation…" : "Proposer avec l’IA"}</button>
          <button
            className="button button-secondary"
            disabled={retailPrice <= 0 || stock <= 0}
            onClick={() => onChange([...tiers, paliersuivant(tiers, stock, retailPrice)])}
            type="button"
          >
            + Ajouter un palier
          </button>
        </div>
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

      {tiers.length > 0 && (
        <p className="muted">
          Meilleur prix de la grille : {fcfa(Math.min(...tiers.map((t) => t.unitPrice)))} ·
          stock disponible {unites(stock, unitLabel)}
        </p>
      )}

      {assistantMessage && <p className="assistant-message" role="status">{assistantMessage}</p>}
    </div>
  );
}
