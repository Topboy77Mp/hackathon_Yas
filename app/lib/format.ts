/**
 * KashFlow — Formatage partagé par les écrans de l'app acheteur.
 * Libellés exacts définis dans docs/design/screens.md.
 */

export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Groupe terminé';
  const hours = Math.floor(totalSeconds / 3600);
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(totalSeconds / 60));
    return `Se termine dans ${minutes} min`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `Se termine dans ${days} j ${remainingHours} h`;
  return `Se termine dans ${hours} h`;
}

export function isDeadlineUrgent(totalSeconds: number): boolean {
  return totalSeconds < 6 * 3600;
}

export function pluralizeUnit(unitLabel: string, quantity: number): string {
  if (quantity <= 1) return unitLabel;
  return unitLabel.endsWith('s') ? unitLabel : `${unitLabel}s`;
}
