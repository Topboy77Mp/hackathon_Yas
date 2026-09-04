/**
 * Fiche produit — écran non détaillé par AGENT_UI en Phase 1A. Version minimale :
 * infos produit, paliers, groupes ouverts. Réutilise TierRow (même primitif que
 * l'écran groupe) : une seule façon d'afficher un palier dans toute l'application.
 */
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Card, TierRow, EmptyState } from '../../components/ui';
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
      <Text variant="body" tone="muted">
        {product.description}
      </Text>

      <Card variant="raised" style={styles.priceCard}>
        <Text variant="caption" tone="muted">
          Prix de détail individuel
        </Text>
        <Text variant="heading" tabularNums>
          {formatFcfa(product.individual_price)} <Text variant="caption" tone="muted">/{product.unit_label}</Text>
        </Text>
      </Card>

      <View style={styles.section}>
        <Text variant="heading">Paliers</Text>
        {product.tiers.map((tier) => (
          <TierRow
            key={tier.id}
            range={`${tier.min_quantity}${tier.max_quantity ? `–${tier.max_quantity}` : '+'} ${product.unit_label}s`}
            price={formatFcfa(tier.unit_price)}
            state={tier.max_quantity === null ? 'next' : 'default'}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text variant="heading">Groupes ouverts</Text>
        {product.open_groups.length === 0 ? (
          <EmptyState title="Aucun groupe ouvert" subtitle="Soyez le premier à en démarrer un pour ce produit." />
        ) : (
          product.open_groups.map((group) => (
            <Pressable key={group.id} onPress={() => router.push(`/g/${group.share_code}`)}>
              <Card style={styles.groupCard}>
                <Text variant="body">{group.name}</Text>
                <Text variant="body" tone="muted" tabularNums>
                  {group.current_quantity} / {group.target_quantity} · {formatFcfa(group.current_unit_price)}
                </Text>
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  content: { padding: spacing.xl, gap: spacing.xs, paddingBottom: spacing.xxxl },
  priceCard: { marginTop: spacing.md, gap: spacing.xs },
  section: { marginTop: spacing.xl, gap: spacing.xs },
  groupCard: { marginTop: spacing.xs, gap: spacing.xs },
});
