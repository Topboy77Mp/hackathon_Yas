import { useState } from "react";
import { demoAvailable, simulateJoins } from "../lib/api/endpoints";
import { entier, fcfa, pluriel, unites } from "../lib/format";
import type { SimulateJoinsOut } from "../lib/api/types";

interface Props {
  groupId: number;
  unitLabel: string;
  onSimulated: () => void;
}

/**
 * Simulateur de démonstration : fait monter le compteur d'un groupe en direct.
 *
 * C'est ce qui déclenche le franchissement de palier devant le jury sans cliquer
 * trente fois. Le panneau ne s'affiche que si `VITE_DEMO_TOKEN` est renseigné —
 * sans jeton, il n'a rien à montrer et le backend refuserait de toute façon.
 */
export function DemoPanel({ groupId, unitLabel, onSimulated }: Props) {
  const [participants, setParticipants] = useState(5);
  const [quantite, setQuantite] = useState(3);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<SimulateJoinsOut | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!demoAvailable) return null;

  async function lancer() {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await simulateJoins(groupId, participants, quantite);
      setResultat(reponse);
      onSimulated();
    } catch (reason) {
      setErreur(reason instanceof Error ? reason.message : "Simulation impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className="demo-panel" aria-labelledby="demo-title">
      <span className="aside-kicker">Mode démonstration</span>
      <h2 id="demo-title">Faire monter le compteur</h2>
      <p className="muted">
        Ajoute des participants fictifs au groupe pour montrer le franchissement de
        palier en direct.
      </p>

      <div className="two-columns">
        <label className="field">
          <span>Participants</span>
          <input
            max="200"
            min="1"
            onChange={(event) => setParticipants(Number(event.target.value))}
            type="number"
            value={participants}
          />
        </label>
        <label className="field">
          <span>{pluriel(quantite, unitLabel)} par participant</span>
          <input
            max="50"
            min="1"
            onChange={(event) => setQuantite(Number(event.target.value))}
            type="number"
            value={quantite}
          />
        </label>
      </div>

      <button
        className="button button-primary"
        disabled={enCours}
        onClick={lancer}
        type="button"
      >
        {enCours ? "Simulation…" : `Ajouter ${unites(participants * quantite, unitLabel)}`}
      </button>

      {erreur && <p className="form-error" role="alert">{erreur}</p>}

      {resultat && (
        <div
          className={resultat.tier_unlocked ? "demo-result demo-unlocked" : "demo-result"}
          role="status"
        >
          {resultat.tier_unlocked ? (
            <>
              <strong>Palier débloqué</strong>
              <p>
                Le prix passe de {fcfa(resultat.previous_unit_price)} à{" "}
                {fcfa(resultat.new_unit_price)} — pour tout le monde, y compris ceux qui
                avaient déjà commandé.
              </p>
            </>
          ) : (
            <>
              <strong>
                +{unites(resultat.added_quantity, unitLabel)}
              </strong>
              <p>
                {resultat.group.quantity_to_next_tier === null
                  ? "Le dernier palier est atteint."
                  : `Encore ${unites(resultat.group.quantity_to_next_tier, unitLabel)} avant le prochain palier.`}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
