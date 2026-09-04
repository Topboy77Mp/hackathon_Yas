import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TierEditor } from "../components/TierEditor";
import { createProduct, suggestTiers } from "../lib/api/endpoints";
import { fcfa } from "../lib/format";
import {
  grilleParDefaut,
  toApiTiers,
  validateTiers,
  type EditableTier,
} from "../lib/tiers";

export function CreateOfferPage() {
  const navigate = useNavigate();

  const [nom, setNom] = useState("");
  const [libelleUnite, setLibelleUnite] = useState("sac");
  const [prixDetail, setPrixDetail] = useState(22000);
  const [stock, setStock] = useState(600);
  const [prixPlancher, setPrixPlancher] = useState<number | "">("");

  const [tiers, setTiers] = useState<EditableTier[]>(() => grilleParDefaut(22000, 600));
  const [justifications, setJustifications] = useState<string[]>([]);
  const [assistantUtilise, setAssistantUtilise] = useState(false);

  const [enSuggestion, setEnSuggestion] = useState(false);
  const [enEnvoi, setEnEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const erreursGrille = useMemo(() => validateTiers(tiers, stock), [tiers, stock]);

  async function proposerPaliers() {
    if (!nom.trim()) {
      setErreur("Renseignez le nom du produit avant de demander une suggestion.");
      return;
    }

    setEnSuggestion(true);
    setErreur(null);
    try {
      const reponse = await suggestTiers({
        product_name: nom.trim(),
        retail_price: prixDetail,
        stock,
        floor_price: prixPlancher === "" ? null : prixPlancher,
      });

      setTiers(
        reponse.tiers.map((tier, index) => ({
          id: `suggestion-${index + 1}`,
          minQuantity: tier.min_quantity,
          unitPrice: tier.unit_price,
        })),
      );
      setJustifications(reponse.tiers.map((tier) => tier.justification).filter(Boolean));
      setAssistantUtilise(true);
    } catch (reason) {
      setErreur(
        reason instanceof Error ? reason.message : "Impossible de proposer une grille.",
      );
    } finally {
      setEnSuggestion(false);
    }
  }

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (erreursGrille.length > 0) {
      setErreur("Corrigez la grille de paliers avant de publier.");
      return;
    }

    setEnEnvoi(true);
    setErreur(null);
    try {
      await createProduct({
        name: nom.trim(),
        unit_label: libelleUnite.trim() || "unité",
        stock,
        individual_price: prixDetail,
        tiers: toApiTiers(tiers),
      });
      navigate("/offres", { replace: true });
    } catch (reason) {
      setErreur(reason instanceof Error ? reason.message : "Impossible de publier l’offre.");
    } finally {
      setEnEnvoi(false);
    }
  }

  return (
    <section className="dashboard-page" aria-labelledby="create-offer-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Nouvelle offre</div>
          <h1 id="create-offer-title">Ajouter une offre avec paliers</h1>
          <p className="page-intro">
            L’assistant propose une grille cohérente ; vous gardez toujours le dernier mot.
          </p>
        </div>
      </div>

      <form className="offer-editor" onSubmit={envoyer}>
        <div className="editor-main">
          <div className="tier-editor">
            <label className="field">
              <span>Nom du produit</span>
              <input
                onChange={(event) => setNom(event.target.value)}
                placeholder="Engrais NPK 15-15-15"
                required
                value={nom}
              />
            </label>

            <div className="two-columns">
              <label className="field">
                <span>Prix de détail unitaire (FCFA)</span>
                <input
                  min="1"
                  onChange={(event) => setPrixDetail(Number(event.target.value))}
                  required
                  type="number"
                  value={prixDetail}
                />
              </label>
              <label className="field">
                <span>Stock disponible</span>
                <input
                  min="1"
                  onChange={(event) => setStock(Number(event.target.value))}
                  required
                  type="number"
                  value={stock}
                />
              </label>
            </div>

            <div className="two-columns">
              <label className="field">
                <span>Unité de vente</span>
                <input
                  onChange={(event) => setLibelleUnite(event.target.value)}
                  placeholder="sac"
                  required
                  value={libelleUnite}
                />
              </label>
              <label className="field">
                <span>Prix plancher (facultatif)</span>
                <input
                  min="1"
                  onChange={(event) =>
                    setPrixPlancher(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  placeholder="En dessous, vous perdez de l’argent"
                  type="number"
                  value={prixPlancher}
                />
              </label>
            </div>
          </div>

          <TierEditor
            errors={erreursGrille}
            onChange={setTiers}
            retailPrice={prixDetail}
            stock={stock}
            tiers={tiers}
            unitLabel={libelleUnite || "unité"}
          />

          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={enEnvoi || erreursGrille.length > 0}
              type="submit"
            >
              {enEnvoi ? "Publication…" : "Publier l’offre"}
            </button>
            <span>
              Prix le plus bas de la grille : {fcfa(Math.min(...tiers.map((t) => t.unitPrice)))}
            </span>
          </div>

          {erreur && <p className="form-error" role="alert">{erreur}</p>}
        </div>

        <aside className="editor-aside">
          <div className="aside-card">
            <span className="aside-kicker">Assistant paliers</span>
            <h2>Une remise réaliste, qui protège votre marge.</h2>
            <p>
              L’assistant part du prix de détail, du stock et du prix plancher que vous
              indiquez. La grille proposée reste modifiable ligne par ligne.
            </p>
            <button
              className="button button-secondary"
              disabled={enSuggestion}
              onClick={proposerPaliers}
              type="button"
            >
              {enSuggestion ? "Analyse…" : "Proposer une grille"}
            </button>
          </div>

          {assistantUtilise && (
            <div className="aside-card">
              <span className="aside-kicker">Pourquoi ces paliers</span>
              {justifications.length > 0 ? (
                <ul className="reason-list">
                  {justifications.map((texte, index) => (
                    <li key={index}>{texte}</li>
                  ))}
                </ul>
              ) : (
                <p>Grille appliquée. Ajustez les chiffres avant de publier.</p>
              )}
            </div>
          )}
        </aside>
      </form>
    </section>
  );
}
