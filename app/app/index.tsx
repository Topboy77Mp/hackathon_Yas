/**
 * Accueil — catalogue. Écran non spécifié en détail par AGENT_UI en Phase 1A
 * (seul l'écran groupe l'est) : liste minimale, avec les composants primitifs.
 */
import { FlatList, Pressable, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Card, EmptyState } from '../components/ui';
import { listProducts } from '../lib/api/endpoints';
import { formatFcfa } from '../lib/format';

export default function AccueilScreen() {
  const router = useRouter();
  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts });

  return (
    <View style={styles.screen}>
      <Text variant="title">KashFlow</Text>
      <Text variant="body" tone="muted">
        Regroupez-vous. Débloquez le meilleur prix.
      </Text>

      <FlatList
        contentContainerStyle={styles.list}
        data={products ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={isLoading ? null : <EmptyState title="Aucun produit disponible" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/produit/${item.id}`)}>
            <Card>
              <Text variant="body">{item.name}</Text>
              <Text variant="caption" tone="muted">
                {item.merchant_name}
              </Text>
              <Text variant="label" style={styles.cardPrice}>
                À partir de {formatFcfa(item.individual_price)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white, padding: spacing.xl },
  list: { gap: spacing.md, marginTop: spacing.xl, paddingBottom: spacing.xxxl },
  cardPrice: { marginTop: spacing.sm },
});
