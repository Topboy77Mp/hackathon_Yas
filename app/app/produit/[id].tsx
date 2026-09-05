/**
 * Fiche produit — infos, grille de paliers, groupes ouverts, et le point d'entrée
 * vers la création de groupe (P0). Réutilise TierRow, le même primitif que l'écran
 * groupe : une seule façon d'afficher un palier dans toute l'application.
 */
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { ActionBar, Text, Card, TierRow, EmptyState, Button, Badge, ProgressBar, AppBar } from '../../components/ui';
import { getProduct } from '../../lib/api/endpoints';
import { formatFcfa, formatCountdown, pluralizeUnit } from '../../lib/format';

export default function FicheProduitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: Number.isFinite(productId),
  });

  if (isLoading) {
    return <View style={styles.screen} />;
  }

  // Sans cet état, une API injoignable laissait un écran blanc définitif.
  if (isError || !product) {
    return (
      <View style={styles.screen}>
        <AppBar title="Produit" onBack={() => router.back()} />
        <EmptyState
          title="Produit indisponible"
          subtitle={error instanceof Error ? error.message : undefined}
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const unite = product.unit_label;

  return (
    <View style={styles.screen}>
      <AppBar title={product.name} subtitle={product.merchant_name} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {product.description && (
          <Text variant="body" tone="muted">
            {product.description}
          </Text>
        )}

        <Card variant="elevated" style={styles.priceCard}>
          <Text variant="caption" tone="muted">
            Prix de détail individuel
          </Text>
          <Text variant="heading" tabularNums>
            {formatFcfa(product.individual_price)}{' '}
            <Text variant="caption" tone="muted">
              /{unite}
            </Text>
          </Text>
          {product.merchant_location && (
            <Text variant="caption" tone="muted">
              Retrait : {product.merchant_name}, {product.merchant_location}
            </Text>
          )}
        </Card>

        <View style={styles.section}>
          <Text variant="heading">Paliers</Text>
          {product.tiers.map((tier, index) => (
            <TierRow
              key={tier.min_quantity}
              range={`${tier.min_quantity}${tier.max_quantity ? `–${tier.max_quantity}` : '+'} ${pluralizeUnit(unite, 2)}`}
              price={formatFcfa(tier.unit_price)}
              state={index === product.tiers.length - 1 ? 'next' : 'default'}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text variant="heading">Groupes ouverts</Text>
          {product.open_groups.length === 0 ? (
            <EmptyState
              title="Aucun groupe ouvert"
              subtitle="Soyez le premier à en démarrer un pour ce produit."
            />
          ) : (
            product.open_groups.map((group) => (
              <Pressable key={group.id} onPress={() => router.push(`/groupe/${group.id}`)}>
                <Card variant="elevated" style={styles.groupCard}>
                  <View style={styles.row}>
                    <Text variant="label">{group.name}</Text>
                    <Badge
                      label={formatCountdown(group.seconds_remaining).replace('Se termine dans ', 'fin dans ')}
                    />
                  </View>
                  <ProgressBar value={group.progress_ratio} />
                  <View style={styles.row}>
                    <Text variant="body" tone="muted" tabularNums>
                      {group.current_quantity} / {group.target_quantity} {pluralizeUnit(unite, group.current_quantity)}
                    </Text>
                    <Text variant="label" tone="success" tabularNums>
                      {formatFcfa(group.current_unit_price)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <ActionBar>
        <Button
          label="Créer un groupe"
          onPress={() => router.push(`/creer-groupe/${product.id}`)}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, gap: spacing.xs, paddingBottom: spacing.xxxl },
  priceCard: { marginTop: spacing.md, gap: spacing.xs, backgroundColor: colors.surface.white },
  section: { marginTop: spacing.xl, gap: spacing.xs },
  groupCard: { marginTop: spacing.xs, gap: spacing.sm, backgroundColor: colors.surface.white },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
