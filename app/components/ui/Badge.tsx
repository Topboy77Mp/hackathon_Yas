import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, alpha } from '@shared/theme/tokens';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'brand' | 'urgent';

// `urgent` : rouge en TEXTE sur une teinte à 10 %, jamais un fond rouge plein —
// le contraste texte-sur-rouge saturé ne passe pas en petite taille (exigence AA).
const toneStyles: Record<BadgeTone, { background: string; text: 'ink' | 'muted' | 'success' | 'alert' }> = {
  neutral: { background: colors.surface.raised, text: 'muted' },
  success: { background: colors.unlock.greenSoft, text: 'success' },
  brand: { background: colors.brand.yellow, text: 'ink' },
  urgent: { background: alpha(colors.alert.red, 0.1), text: 'alert' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { background, text } = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text variant="caption" tone={text} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { fontWeight: '500' },
});
