/**
 * Fiche produit — écran non détaillé par AGENT_UI en Phase 1A. Version minimale :
 * infos produit, paliers, groupes ouverts.
 */
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Card } from '../../components/ui';
import { getProduct } from '../../lib/api/endpoints';
import { formatFcfa } from '../../lib/format';

export default function FicheProduitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  if (isLoading || !product) {
    return <View style={styles.screen} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">{product.name}</Text>
      <Text variant="caption" tone="muted">
        {product.merchant_name}
      </Text>
      <Text variant="body">{product.description}</Text>
      <Text variant="heading" style={styles.spacedTop}>
        Prix individuel : {formatFcfa(product.individual_price)}
      </Text>

      <Text variant="heading" style={styles.spacedTop}>
        Paliers
      </Text>
      {product.tiers.map((tier) => (
        <Text key={tier.id} variant="body">
          {tier.min_quantity}
          {tier.max_quantity ? `–${tier.max_quantity}` : '+'} {product.unit_label}s → {formatFcfa(tier.unit_price)}
        </Text>
      ))}

      <Text variant="heading" style={styles.spacedTop}>
        Groupes ouverts
      </Text>
      {product.open_groups.length === 0 ? (
        <Text variant="body" tone="muted">
          Aucun groupe ouvert pour l'instant.
        </Text>
      ) : (
        product.open_groups.map((group) => (
          <Pressable key={group.id} onPress={() => router.push(`/groupe/${group.id}`)}>
            <Card style={styles.card}>
              <Text variant="body">{group.name}</Text>
              <Text variant="body" tone="muted">
                {group.current_quantity} / {group.target_quantity} · {formatFcfa(group.current_unit_price)}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl },
  spacedTop: { marginTop: spacing.lg },
  card: { marginTop: spacing.xs },
});
