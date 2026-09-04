/**
 * KashFlow — Design tokens
 * Source de vérité visuelle unique, consommée par /app (React Native + web) et /dashboard (HTML/CSS).
 * Aucune dépendance React Native ni DOM : uniquement des constantes.
 * Aucune valeur hexadécimale, aucune taille d'espacement, aucun rayon ne doit être codé en dur ailleurs.
 */

export const colors = {
  brand: {
    yellow: '#FFD400',
    yellowDeep: '#F5B800',
    ink: '#111418',
  },
  unlock: {
    green: '#177A43',
    greenSoft: '#E7F4EC',
  },
  accent: {
    lime: '#A9CB3B',
    navy: '#16357A',
  },
  alert: {
    red: '#E03B2C',
  },
  surface: {
    white: '#FFFFFF',
    raised: '#F7F7F4',
  },
  line: '#E4E4DE',
  text: {
    muted: '#6C6F73',
  },
} as const;

/**
 * Échelle d'espacement en base 4. Ne pas interpoler de valeur hors de cette échelle.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Gouttière d'écran : 20px en mobile (/app), 32px en web (/dashboard et /app en largeur ≥600).
 */
export const gutter = {
  mobile: 20,
  web: 32,
} as const;

/**
 * Deux rayons dans toute l'application, pas cinq.
 */
export const radii = {
  block: 12,
  pill: 999,
} as const;

/**
 * Aucune ombre portée dans l'application, à l'exception de la barre d'action fixe
 * en bas de l'écran groupe (cf. <profondeur> du prompt de conception).
 */
export const elevation = {
  none: 'none',
  actionBar: '0 -1px 0 0 #E4E4DE',
} as const;

/**
 * Durées de l'unique séquence d'animation non déclenchée par l'utilisateur : le passage
 * de palier (compteur, barre, prix barré → prix vert). Voir /docs/design/motion.md.
 */
export const motion = {
  tierUnlockTotalMs: 900,
  counterIncrementMs: 500,
  progressBarFillMs: 400,
  priceSwapMs: 400,
  priceSwapDelayMs: 500,
} as const;

/**
 * Cibles tactiles minimales (accessibilité — contrainte de design, pas un confort).
 */
export const hitSlop = {
  minTouchTarget: 44,
} as const;

/**
 * Points de rupture. /app ne devient jamais une interface desktop : au-delà de 600,
 * son contenu reste une colonne centrée à 560px maximum. /dashboard est conçu pour
 * ≥1024px et dégrade en colonne unique sous 900px, sans mise en page dédiée.
 */
export const breakpoints = {
  appCentered: 600,
  appMaxContentWidth: 560,
  dashboardDesigned: 1024,
  dashboardCollapse: 900,
  dashboardMaxContentWidth: 1280,
} as const;

/**
 * Teinte un token de couleur. Évite de coder en dur des variantes rgba() dans les
 * composants : la couleur reste définie une seule fois, seule l'opacité varie.
 * Utilisé pour les fonds de pastilles (palier suivant, compte à rebours urgent).
 */
export function alpha(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const tokens = {
  colors,
  spacing,
  gutter,
  radii,
  elevation,
  motion,
  hitSlop,
  breakpoints,
} as const;

export type Tokens = typeof tokens;
