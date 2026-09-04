/**
 * Écran-témoin temporaire pour les routes dont AGENT_UI n'a pas encore livré la spec
 * (seul l'écran groupe est spécifié en Phase 1A, cf. docs/design/screens.md).
 * À remplacer feature par feature dès que /docs/design/screens.md couvre l'écran.
 * Ce n'est PAS un composant primitif partagé : il vit dans /app/features, propriété
 * d'AGENT_FRONT, et n'est utilisé que pour prouver que la route existe et navigue.
 *
 * `onBack` n'est pas optionnel par confort : un écran sans aucun moyen d'y entrer ET
 * d'en sortir est un cul-de-sac de navigation, repéré en auditant l'app (0 élément
 * cliquable sur ces écrans avant ce correctif).
 */
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, AppBar } from '../../components/ui';

export function ScreenStub({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <AppBar title={title} onBack={onBack} />
      <View style={styles.content}>
        {subtitle && (
          <Text variant="body" tone="muted" align="center">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
});
