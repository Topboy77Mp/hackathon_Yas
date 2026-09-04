/**
 * KashFlow — Sheet
 * Conteneur de contenu pour les écrans présentés en modale par expo-router
 * (`Stack.Screen options={{ presentation: 'modal' }}`, cf. « Rejoindre »). Ne réimplémente
 * pas de logique de présentation/gestes : c'est expo-router qui gère la modale elle-même.
 * `onClose`, quand fourni, affiche une croix : une modale sans échappatoire est un
 * cul-de-sac de navigation (constaté sur l'écran « Rejoindre » avant ce correctif).
 */
import { View, Pressable, type ViewProps, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, hitSlop } from '@shared/theme/tokens';
import { Text } from './Text';

export interface SheetProps extends ViewProps {
  title?: string;
  onClose?: () => void;
}

export function Sheet({ title, onClose, children, style, ...rest }: SheetProps) {
  return (
    <View {...rest} style={[styles.container, style]}>
      {(title || onClose) && (
        <View style={styles.header}>
          {title && (
            <Text variant="heading" style={styles.title}>
              {title}
            </Text>
          )}
          {onClose && (
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeTouchable}>
              <Ionicons name="close" size={20} color={colors.brand.ink} />
            </Pressable>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
    borderTopLeftRadius: radii.block,
    borderTopRightRadius: radii.block,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1 },
  closeTouchable: {
    width: hitSlop.minTouchTarget,
    height: hitSlop.minTouchTarget,
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
