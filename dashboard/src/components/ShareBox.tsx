import { useState } from "react";
import { shareMessage } from "../lib/api/endpoints";
import type { ShareMessageOut } from "../lib/api/types";
import { isDemo } from "../lib/demo";

/**
 * Lien de partage et messages prêts à envoyer (IA-2).
 *
 * `navigator.clipboard` n'existe qu'en contexte sécurisé : sur une démo servie en
 * HTTP depuis une IP locale, il est absent. Le repli par `execCommand` garde le
 * bouton fonctionnel ; sans lui il échouait en silence au pire moment.
 */
export function ShareBox({ groupId }: { groupId: number }) {
  const [donnees, setDonnees] = useState<ShareMessageOut | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function generer() {
    setEnCours(true);
    setErreur(null);
    try {
      if (isDemo()) {
        const shareUrl = `${window.location.origin}/groupes/${groupId}`;
        setDonnees({
          share_url: shareUrl,
          source: "repli",
          variants: [
            { registre: "Direct", texte: `Rejoignez notre achat groupé KashFlow : ${shareUrl}` },
            { registre: "Convivial", texte: `On achète ensemble pour payer moins ! Découvrez le groupe : ${shareUrl}` },
            { registre: "Urgent", texte: `Le groupe avance, participez avant la clôture : ${shareUrl}` },
          ],
        });
      } else {
        setDonnees(await shareMessage(groupId));
      }
    } catch (reason) {
      setErreur(reason instanceof Error ? reason.message : "Génération impossible.");
    } finally {
      setEnCours(false);
    }
  }

  async function copier(texte: string, cle: string) {
    const reussi = await copierDansLePressePapier(texte);
    setCopie(reussi ? cle : null);
    if (!reussi) setErreur("Copie impossible. Sélectionnez le texte manuellement.");
    else window.setTimeout(() => setCopie(null), 2000);
  }

  return (
    <section className="share-box" aria-labelledby="share-title">
      <span className="aside-kicker">Assistant IA</span>
      <h2 id="share-title">Préparer le partage</h2>

      {!donnees && (
        <>
          <p className="muted">
            Obtenez trois messages prêts à envoyer pour mobiliser les acheteurs.
          </p>
          <button
            className="button button-secondary"
            disabled={enCours}
            onClick={generer}
            type="button"
          >
            {enCours ? "Rédaction…" : "Préparer le partage"}
          </button>
        </>
      )}

      {donnees && (
        <>
          <div className="share-url">
            <code>{donnees.share_url}</code>
            <button
              className="button button-secondary"
              onClick={() => void copier(donnees.share_url, "url")}
              type="button"
            >
              {copie === "url" ? "Copié" : "Copier le lien"}
            </button>
          </div>

          <ul className="share-variants">
            {donnees.variants.map((variante) => (
              <li key={variante.registre}>
                <span className="aside-kicker">{variante.registre}</span>
                <p>{variante.texte}</p>
                <button
                  className="button button-ghost"
                  onClick={() => void copier(variante.texte, variante.registre)}
                  type="button"
                >
                  {copie === variante.registre ? "Copié" : "Copier ce message"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {erreur && <p className="form-error" role="alert">{erreur}</p>}
    </section>
  );
}

async function copierDansLePressePapier(texte: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texte);
      return true;
    } catch {
      // Permission refusée ou contexte non sécurisé : on tente le repli.
    }
  }

  const zone = document.createElement("textarea");
  zone.value = texte;
  zone.setAttribute("readonly", "");
  zone.style.position = "fixed";
  zone.style.opacity = "0";
  document.body.appendChild(zone);
  zone.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(zone);
  }
}
