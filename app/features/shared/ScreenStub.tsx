/**
 * Écran-témoin temporaire pour les routes dont AGENT_UI n'a pas encore livré la spec
 * (seul l'écran groupe est spécifié en Phase 1A, cf. docs/design/screens.md).
 * À remplacer feature par feature dès que /docs/design/screens.md couvre l'écran.
 * Ce n'est PAS un composant primitif partagé : il vit dans /app/features, propriété
 * d'AGENT_FRONT, et n'est utilisé que pour prouver que la route existe et navigue.
 */
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@shared/theme/tokens';
import { Text } from '../../components/ui';

export function ScreenStub({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.screen}>
      <Text variant="title" align="center">
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" tone="muted" align="center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
