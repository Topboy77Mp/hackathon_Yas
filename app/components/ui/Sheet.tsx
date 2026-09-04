/**
 * KashFlow — Sheet
 * Conteneur de contenu pour les écrans présentés en modale par expo-router
 * (`Stack.Screen options={{ presentation: 'modal' }}`, cf. « Rejoindre »). Ne réimplémente
 * pas de logique de présentation/gestes : c'est expo-router qui gère la modale elle-même.
 */
import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@shared/theme/tokens';
import { Text } from './Text';

export interface SheetProps extends ViewProps {
  title?: string;
}

export function Sheet({ title, children, style, ...rest }: SheetProps) {
  return (
    <View {...rest} style={[styles.container, style]}>
      {title && (
        <Text variant="heading" style={styles.title}>
          {title}
        </Text>
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
  title: { marginBottom: spacing.xs },
});
