/**
 * KashFlow — ActionBar
 * Barre d'actions collée en bas d'écran.
 *
 * Elle porte l'encart bas du système : sur les Android à navigation gestuelle,
 * un bouton posé à `bottom: 0` se retrouve sous la barre de geste et devient
 * partiellement intouchable. Le défaut est invisible au navigateur.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@shared/theme/tokens';

export interface ActionBarProps {
  children: ReactNode;
  /** Vrai quand l'écran vit dans un onglet : la barre d'onglets porte déjà l'encart. */
  insideTabs?: boolean;
}

export function ActionBar({ children, insideTabs = false }: ActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { paddingBottom: (insideTabs ? 0 : insets.bottom) + spacing.lg }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface.white,
  },
});
