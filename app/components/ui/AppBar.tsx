/**
 * KashFlow — AppBar
 * En-tête d'écran : retour, titre, sous-titre, emplacement libre à droite.
 * La pastille de retour fait 36px à l'œil mais 44px de cible tactile — la maquette
 * dessine 36, la règle d'accessibilité impose 44 : les deux tiennent avec du padding.
 */
import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, hitSlop } from '@shared/theme/tokens';
import { Text } from './Text';

export interface AppBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function AppBar({ title, subtitle, onBack, right }: AppBarProps) {
  // Sans cet encart, le titre passe sous la barre de statut et sous l'encoche
  // sur un vrai appareil. Invisible au navigateur, criant sur téléphone.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.md }]}>
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backTouchable}
        >
          <View style={styles.backCircle}>
            <Ionicons name="chevron-back" size={18} color={colors.brand.ink} />
          </View>
        </Pressable>
      )}

      <View style={styles.titles}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  backTouchable: {
    width: hitSlop.minTouchTarget,
    height: hitSlop.minTouchTarget,
    marginLeft: -4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
});
