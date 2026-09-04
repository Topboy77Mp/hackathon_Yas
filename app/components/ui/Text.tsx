/**
 * KashFlow — Text
 * Seul point d'entrée typographique de l'app acheteur. Aucune taille de police,
 * aucune famille littérale ne doit apparaître ailleurs : tout passe par `variant`.
 */
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors } from '@shared/theme/tokens';
import { typeScale, type TypeScaleKey } from '@shared/theme/typography';
import { resolveNativeFontFamily } from './nativeFont';

type Tone = 'ink' | 'muted' | 'success' | 'alert';

const toneColor: Record<Tone, string> = {
  ink: colors.brand.ink,
  muted: colors.text.muted,
  success: colors.unlock.green,
  alert: colors.alert.red,
};

export interface TextComponentProps extends Omit<RNTextProps, 'style'> {
  variant?: TypeScaleKey;
  tone?: Tone;
  tabularNums?: boolean;
  align?: TextStyle['textAlign'];
  style?: RNTextProps['style'];
}

export function Text({
  variant = 'body',
  tone = 'ink',
  tabularNums = false,
  align,
  style,
  ...rest
}: TextComponentProps) {
  const scale = typeScale[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: resolveNativeFontFamily(scale.fontFamily, scale.weight),
          fontSize: scale.size,
          lineHeight: scale.lineHeight,
          color: toneColor[tone],
          textAlign: align,
        },
        tabularNums && { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] },
        style,
      ]}
    />
  );
}
