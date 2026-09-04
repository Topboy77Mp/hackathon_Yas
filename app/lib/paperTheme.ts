/**
 * KashFlow — thème react-native-paper.
 * Paper apporte ses propres composants (Button, TextInput, Card, ProgressBar...), mais son
 * thème Material par défaut ignore nos tokens. Ce fichier fait le pont : les couleurs, les
 * rayons et les polices de Paper viennent de shared/theme/**, jamais de valeurs Material
 * par défaut. Spécifique à /app (React Native) : /dashboard ne charge pas Paper.
 */
import { configureFonts, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { colors, radii, alpha } from '@shared/theme/tokens';
import { fontFamilies, fontWeights } from '@shared/theme/typography';
import { resolveNativeFontFamily } from '../components/ui/nativeFont';

const baseFont = {
  fontFamily: resolveNativeFontFamily(fontFamilies.body, fontWeights.bodyRegular),
};

const numbersFont = {
  fontFamily: resolveNativeFontFamily(fontFamilies.numbers, fontWeights.numbersSemiBold),
};

const fonts = configureFonts({
  config: {
    displayLarge: numbersFont,
    displayMedium: numbersFont,
    displaySmall: numbersFont,
    headlineLarge: numbersFont,
    headlineMedium: numbersFont,
    headlineSmall: numbersFont,
    titleLarge: numbersFont,
    titleMedium: numbersFont,
    titleSmall: numbersFont,
    bodyLarge: baseFont,
    bodyMedium: baseFont,
    bodySmall: baseFont,
    labelLarge: { fontFamily: resolveNativeFontFamily(fontFamilies.body, fontWeights.bodyMedium) },
    labelMedium: { fontFamily: resolveNativeFontFamily(fontFamilies.body, fontWeights.bodyMedium) },
    labelSmall: baseFont,
  },
});

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: radii.block / 4, // Paper multiplie roundness par des facteurs internes selon le composant
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand.yellow,
    onPrimary: colors.brand.ink,
    primaryContainer: alpha(colors.brand.yellow, 0.16),
    onPrimaryContainer: colors.brand.ink,
    secondary: colors.unlock.green,
    onSecondary: colors.surface.white,
    secondaryContainer: colors.unlock.greenSoft,
    onSecondaryContainer: colors.unlock.green,
    tertiary: colors.accent.navy,
    onTertiary: colors.surface.white,
    error: colors.alert.red,
    onError: colors.surface.white,
    errorContainer: alpha(colors.alert.red, 0.1),
    onErrorContainer: colors.alert.red,
    background: colors.surface.page,
    onBackground: colors.brand.ink,
    surface: colors.surface.white,
    onSurface: colors.brand.ink,
    surfaceVariant: colors.surface.raised,
    onSurfaceVariant: colors.text.muted,
    outline: colors.line,
    outlineVariant: colors.line,
    inverseSurface: colors.brand.ink,
    inverseOnSurface: colors.surface.white,
  },
};
