/**
 * Formatage d'affichage. Aucun calcul de prix : le contrat l'interdit côté client.
 * Les montants arrivent déjà calculés par l'API, on ne fait que les habiller.
 */

const nombre = new Intl.NumberFormat("fr-FR");

export function entier(valeur: number): string {
  return nombre.format(Math.round(valeur));
}

/** L'espace insécable évite « 22 000 » coupé en fin de ligne. */
export function fcfa(valeur: number): string {
  return `${nombre.format(Math.round(valeur))} FCFA`;
}

/**
 * « 1 sac », « 146 sacs », « 0 sac ». En français le pluriel commence à deux :
 * afficher « 1 sacs » dans un tableau de paliers se remarque immédiatement.
 */
export function unites(quantite: number, libelle: string): string {
  return `${entier(quantite)} ${libelle}${Math.abs(quantite) >= 2 ? "s" : ""}`;
}

/** Le libellé seul, accordé : « sac » ou « sacs ». */
export function pluriel(quantite: number, libelle: string): string {
  return `${libelle}${Math.abs(quantite) >= 2 ? "s" : ""}`;
}

export function pourcentage(ratio: number): number {
  return Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
}

/**
 * « dans 1 j 14 h », « dans 42 min », « clôturé ».
 * Sous l'heure on descend à la minute : c'est le moment où la clôture compte.
 */
export function delai(secondes: number): string {
  if (secondes <= 0) return "clôturé";

  const heures = Math.floor(secondes / 3600);
  if (heures >= 24) {
    const jours = Math.floor(heures / 24);
    const reste = heures % 24;
    return reste > 0 ? `dans ${jours} j ${reste} h` : `dans ${jours} j`;
  }
  if (heures >= 1) {
    const minutes = Math.floor((secondes % 3600) / 60);
    return minutes > 0 ? `dans ${heures} h ${minutes} min` : `dans ${heures} h`;
  }
  return `dans ${Math.max(Math.floor(secondes / 60), 1)} min`;
}

const LIBELLES: Record<string, string> = {
  OPEN: "Ouvert",
  LOCKED: "Objectif atteint",
  COMPLETED: "Livré",
  CANCELLED: "Annulé",
  ACTIVE: "En ligne",
  DRAFT: "Brouillon",
  CLOSED: "Retiré",
};

export function libelleStatut(statut: string): string {
  return LIBELLES[statut] ?? statut;
}

/** Classe de pastille : vert quand c'est gagné, rouge quand c'est perdu. */
export function tonStatut(statut: string): "actif" | "gagne" | "perdu" | "neutre" {
  if (statut === "OPEN" || statut === "ACTIVE") return "actif";
  if (statut === "LOCKED" || statut === "COMPLETED") return "gagne";
  if (statut === "CANCELLED") return "perdu";
  return "neutre";
}

/** Remise d'un palier par rapport au prix de détail, en pourcentage entier. */
export function remise(prixDetail: number, prixPalier: number): number {
  if (prixDetail <= 0) return 0;
  return Math.round((1 - prixPalier / prixDetail) * 100);
}
