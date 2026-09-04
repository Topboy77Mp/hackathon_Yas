import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMerchantProduct, suggestTiers } from "../lib/dashboardData";
import type { OfferTier } from "../lib/merchantFixtures";
import { offerFixtures } from "../lib/merchantFixtures";

const amount = new Intl.NumberFormat("fr-FR");

const initialTiers = offerFixtures[0].tiers;

export function CreateOfferPage() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<OfferTier[]>(initialTiers);
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const [productName, setProductName] = useState("Engrais NPK 15-15-15");
  const [retailPrice, setRetailPrice] = useState(22_000);
  const [stock, setStock] = useState(600);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTier(id: string, key: "minQuantity" | "unitPrice", rawValue: string) {
    setTiers((current) => current.map((tier) => tier.id === id ? { ...tier, [key]: Number(rawValue) } : tier));
  }

  function addTier() {
    setTiers((current) => [...current, {
      id: `tier-${current.length + 1}`,
      minQuantity: (current.at(-1)?.minQuantity ?? 0) + 50,
      unitPrice: Math.max((current.at(-1)?.unitPrice ?? 0) - 1_000, 0),
    }]);
  }

  async function generateTiers() {
    setIsSuggesting(true);
    setError(null);
    try {
      const suggested = await suggestTiers({ name: productName, retailPrice, stock });
      setTiers(suggested.map((tier, index) => ({
        id: `tier-${index + 1}`,
        minQuantity: tier.minQuantity,
        unitPrice: tier.unitPrice,
      })));
      setSuggestionVisible(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de proposer des paliers.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createMerchantProduct({ name: productName, retailPrice, stock, tiers });
      navigate("/offres");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de publier l’offre.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="dashboard-page" aria-labelledby="create-offer-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Nouvelle offre</div>
          <h1 id="create-offer-title">Ajouter une offre avec paliers</h1>
          <p className="page-intro">L’assistant suggère une grille, mais vous gardez toujours le dernier mot.</p>
        </div>
      </div>

      <form className="offer-editor" onSubmit={submit}>
        <div className="editor-main">
          <label className="field">
            <span>Nom du produit</span>
            <input onChange={(event) => setProductName(event.target.value)} required value={productName} />
          </label>
          <div className="two-columns">
            <label className="field">
              <span>Prix de détail unitaire (FCFA)</span>
              <input min="0" onChange={(event) => setRetailPrice(Number(event.target.value))} required type="number" value={retailPrice} />
            </label>
            <label className="field">
              <span>Stock disponible</span>
              <input min="1" onChange={(event) => setStock(Number(event.target.value))} required type="number" value={stock} />
            </label>
          </div>

          <div className="tier-editor">
            <div className="section-title-row">
              <div>
                <h2>Grille des paliers</h2>
                <p>Le prix baisse à mesure que le volume total augmente.</p>
              </div>
              <button className="button button-secondary" disabled={isSuggesting} onClick={generateTiers} type="button">{isSuggesting ? "Suggestion…" : "Proposer des paliers"}</button>
            </div>
            {suggestionVisible && <p className="suggestion">Suggestion appliquée. Ajustez les chiffres avant de publier.</p>}
            <div className="tier-table" role="table" aria-label="Paliers de prix">
              <div className="tier-row tier-head" role="row">
                <span>Palier</span><span>À partir de</span><span>Prix unitaire</span><span>Remise</span>
              </div>
              {tiers.map((tier, index) => {
                const discount = Math.round((1 - tier.unitPrice / 22_000) * 100);
                return <div className="tier-row" key={tier.id} role="row">
                  <span>Palier {index + 1}</span>
                  <label><input aria-label={`Quantité minimale palier ${index + 1}`} min="1" onChange={(event) => updateTier(tier.id, "minQuantity", event.target.value)} type="number" value={tier.minQuantity} /> sacs</label>
                  <label><input aria-label={`Prix palier ${index + 1}`} min="0" onChange={(event) => updateTier(tier.id, "unitPrice", event.target.value)} type="number" value={tier.unitPrice} /> FCFA</label>
                  <span className={index === tiers.length - 1 ? "tier-best" : ""}>{discount === 0 ? "Prix détail" : `−${discount} %`}</span>
                </div>;
              })}
            </div>
            <button className="button button-ghost" onClick={addTier} type="button">+ Ajouter un palier</button>
          </div>
          <div className="form-actions">
            <button className="button button-primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Publication…" : "Publier l’offre"}</button>
            <span>Prévisualisation : prix minimum {amount.format(tiers.at(-1)?.unitPrice ?? 0)} FCFA</span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <aside className="editor-aside">
          <div className="aside-card">
            <span className="aside-kicker">Assistant paliers</span>
            <h2>Une remise réaliste, qui protège votre marge.</h2>
            <p>La suggestion IA est disponible en mode démo. L’appel réel sera ajouté au backend.</p>
            <button className="button button-secondary" disabled={isSuggesting} onClick={generateTiers} type="button">Voir la suggestion</button>
          </div>
          <div className="aside-card aside-success">
            <span>Sur votre offre active</span>
            <strong>146 sacs réservés</strong>
            <p>2 774 000 FCFA de chiffre d’affaires engagé.</p>
          </div>
        </aside>
      </form>
    </section>
  );
}
