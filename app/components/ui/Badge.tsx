import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@shared/theme/tokens';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'brand';

// alert.red reste réservé au texte (compte à rebours, erreurs) : pas de fond rouge plein,
// le contraste texte-sur-rouge est trop fragile en petite taille (cf. exigence AA).
const toneStyles: Record<BadgeTone, { background: string; text: 'ink' | 'muted' | 'success' }> = {
  neutral: { background: colors.surface.raised, text: 'muted' },
  success: { background: colors.unlock.greenSoft, text: 'success' },
  brand: { background: colors.brand.yellow, text: 'ink' },
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
