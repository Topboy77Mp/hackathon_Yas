import { useEffect, useRef, useState } from "react";
import { getNotifications, markNotificationRead } from "../lib/api/endpoints";
import { useAsyncResource } from "../lib/useAsyncResource";

const RAFRAICHISSEMENT_MS = 15000;

/**
 * Cloche de notifications du commerçant.
 *
 * C'est ici qu'atterrit le franchissement de palier : la ligne est écrite par le
 * backend au moment où le prix baisse, et c'est le seul endroit du dashboard où
 * l'événement devient visible sans recharger l'écran groupe.
 */
export function NotificationBell() {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  const resource = useAsyncResource(getNotifications, [], {
    pollMs: RAFRAICHISSEMENT_MS,
  });

  useEffect(() => {
    if (!ouvert) return;

    function auClic(event: MouseEvent) {
      if (!conteneur.current?.contains(event.target as Node)) setOuvert(false);
    }
    function auClavier(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }

    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  // Une cloche qui échoue ne doit rien casser : elle disparaît, le reste tourne.
  if (resource.error && !resource.data) return null;

  const nonLues = resource.data?.unread_count ?? 0;
  const lignes = resource.data?.notifications ?? [];

  async function marquerLue(id: number) {
    try {
      await markNotificationRead(id);
      resource.refresh();
    } catch {
      // Sans conséquence pour l'utilisateur : le prochain tour corrigera l'état.
    }
  }

  return (
    <div className="bell" ref={conteneur}>
      <button
        aria-expanded={ouvert}
        aria-haspopup="true"
        aria-label={
          nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"
        }
        className="bell-button"
        onClick={() => setOuvert((v) => !v)}
        type="button"
      >
        <span aria-hidden="true">🔔</span>
        {nonLues > 0 && <span className="bell-count">{nonLues}</span>}
      </button>

      {ouvert && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            <span className="muted">{nonLues} non lue{nonLues > 1 ? "s" : ""}</span>
          </div>

          {lignes.length === 0 && (
            <p className="bell-empty">Aucune notification pour le moment.</p>
          )}

          <ul className="bell-list">
            {lignes.map((ligne) => (
              <li className={ligne.read ? "bell-item" : "bell-item bell-unread"} key={ligne.id}>
                <strong>{ligne.title}</strong>
                <p>{ligne.message}</p>
                {!ligne.read && (
                  <button
                    className="button button-ghost"
                    onClick={() => void marquerLue(ligne.id)}
                    type="button"
                  >
                    Marquer comme lue
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
