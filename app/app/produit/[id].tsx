import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Card, Button } from '../../components/ui';
import { getProduct } from '../../lib/api/endpoints';
import { formatFcfa } from '../../lib/format';
import { Ionicons } from '@expo/vector-icons';

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
      {/* Merchant Verified Badge */}
      <View style={styles.merchantHeader}>
        <Ionicons name="checkmark-circle" size={16} color={colors.unlock.green} />
        <Text variant="caption" style={{ color: colors.unlock.green, fontWeight: '700' }}>
          {product.merchant_name} · Tsévié ✓
        </Text>
      </View>

      {/* Product Title & Info */}
      <Text variant="title" style={styles.productTitle}>{product.name}</Text>
      <Text variant="body" tone="muted">{product.description}</Text>

      {/* Detail Price */}
      <View style={styles.basePriceCard}>
        <Text variant="caption" tone="muted">Prix de détail individuel</Text>
        <Text variant="title" style={{ fontSize: 24, fontWeight: '800' }}>
          {formatFcfa(product.individual_price)} <Text variant="caption" tone="muted">/{product.unit_label}</Text>
        </Text>
      </View>

      {/* Pricing Tiers Table Card */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" style={styles.sectionTitle}>Paliers de Prix Dégressifs</Text>
        <Text variant="caption" tone="muted">Plus la communauté achète, plus le prix baisse !</Text>
      </View>

      <View style={styles.tiersContainer}>
        {product.tiers.map((tier, idx) => {
          const isHighestTier = !tier.max_quantity;
          return (
            <View
              key={tier.id}
              style={[
                styles.tierRow,
                isHighestTier && styles.highestTierRow,
              ]}
            >
              <View>
                <Text variant="label" style={{ fontWeight: '700' }}>
                  Palier {idx + 1} ({tier.min_quantity}{tier.max_quantity ? `–${tier.max_quantity}` : '+'} {product.unit_label}s)
                </Text>
                <Text variant="caption" tone="muted">
                  {isHighestTier ? '🔥 Objectif Grossiste Maximal' : 'Tarif groupé'}
                </Text>
              </View>
              <Text
                variant="heading"
                tabularNums
                style={isHighestTier ? styles.highestTierPrice : styles.tierPrice}
              >
                {formatFcfa(tier.unit_price)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Open Groups Section */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" style={styles.sectionTitle}>Groupes d'Achat Ouverts</Text>
      </View>

      {product.open_groups.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text variant="body" tone="muted">Aucun groupe ouvert pour l'instant.</Text>
          <Button
            label="Créer le 1er groupe 🚀"
            onPress={() => router.push(`/produit/${product.id}`)}
          />
        </Card>
      ) : (
        product.open_groups.map((group) => (
          <Pressable key={group.id} onPress={() => router.push(`/g/${group.share_code}`)}>
            <Card style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text variant="heading" style={{ fontSize: 16, fontWeight: '700' }}>{group.name}</Text>
                  <Text variant="caption" tone="muted">Code #{group.share_code}</Text>
                </View>
                <View style={styles.groupPriceTag}>
                  <Text variant="label" tabularNums style={styles.groupPriceText}>
                    {formatFcfa(group.current_unit_price)}
                  </Text>
                </View>
              </View>

              <View style={styles.groupProgressRow}>
                <Text variant="label" tabularNums>
                  {group.current_quantity} / {group.target_quantity} {product.unit_label}s
                </Text>
                <Text variant="caption" style={{ color: colors.unlock.green, fontWeight: '700' }}>
                  Rejoindre ➔
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.unlock.greenSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  productTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  basePriceCard: {
    backgroundColor: colors.surface.raised,
    padding: spacing.md,
    borderRadius: radii.block,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionHeader: {
    marginTop: spacing.md,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  tiersContainer: {
    gap: spacing.xs,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.block,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.line,
  },
  highestTierRow: {
    backgroundColor: colors.unlock.greenSoft,
    borderColor: colors.unlock.green,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.ink,
  },
  highestTierPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.unlock.green,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  groupCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupPriceTag: {
    backgroundColor: colors.brand.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  groupPriceText: {
    color: colors.brand.ink,
    fontWeight: '800',
  },
  groupProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});

