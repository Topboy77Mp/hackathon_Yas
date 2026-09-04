/**
 * KashFlow — Typographie
 * Aucune dépendance React Native ni DOM : uniquement des constantes.
 * Archivo pour les chiffres et titres (chiffres tabulaires obligatoires, poids 600/700).
 * Inter pour le texte courant (poids 400/500 uniquement).
 */

export const fontFamilies = {
  numbers: 'Archivo',
  body: 'Inter',
} as const;

export const fontWeights = {
  numbersSemiBold: '600',
  numbersBold: '700',
  bodyRegular: '400',
  bodyMedium: '500',
} as const;

/**
 * Chiffres tabulaires obligatoires sur toute valeur numérique animée (compteur, prix) :
 * sans chasse fixe, les chiffres sautent latéralement pendant l'animation.
 */
export const tabularNums = {
  fontVariant: ['tabular-nums'],
} as const;

/**
 * Échelle typographique. size/lineHeight en px. Casse de phrase partout — jamais de
 * majuscules espacées.
 */
export const typeScale = {
  display: { fontFamily: fontFamilies.numbers, weight: fontWeights.numbersBold, size: 44, lineHeight: 48 },
  title: { fontFamily: fontFamilies.numbers, weight: fontWeights.numbersSemiBold, size: 28, lineHeight: 34 },
  heading: { fontFamily: fontFamilies.numbers, weight: fontWeights.numbersSemiBold, size: 20, lineHeight: 26 },
  body: { fontFamily: fontFamilies.body, weight: fontWeights.bodyRegular, size: 16, lineHeight: 24 },
  label: { fontFamily: fontFamilies.body, weight: fontWeights.bodyMedium, size: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.body, weight: fontWeights.bodyRegular, size: 12, lineHeight: 16 },
} as const;

export const typography = {
  fontFamilies,
  fontWeights,
  tabularNums,
  typeScale,
} as const;

export type Typography = typeof typography;
export type TypeScaleKey = keyof typeof typeScale;
