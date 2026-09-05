/**
 * Fiche produit — Version "Premium & Energetic".
 * Interface propre et professionnelle avec bannière produit, badge marchand vérifié,
 * grille de paliers dynamique, groupes ouverts actifs et barre d'action fixe.
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadow, alpha } from '@shared/theme/tokens';
import { Text, Card, TierRow, EmptyState, Button, Badge, ProgressBar } from '../../components/ui';
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
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonText} />
      </View>
    );
  }

  const bestTierPrice = product.tiers.length > 0
    ? Math.min(...product.tiers.map((t) => t.unit_price))
    : product.individual_price;

  const maxDiscount = Math.round(((product.individual_price - bestTierPrice) / product.individual_price) * 100);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HERO BANNER & IMAGE */}
        <View style={styles.heroContainer}>
          <View style={styles.imagePlaceholder}>
            {product.image_url && !product.image_url.includes('demo') ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <Ionicons
                name={product.id.includes('npk') ? 'leaf' : product.id.includes('semences') ? 'nutrition' : 'school'}
                size={64}
                color={colors.unlock.green}
              />
            )}
          </View>

          {maxDiscount > 0 && (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Jusqu'à -{maxDiscount}% en groupe</Text>
            </View>
          )}
        </View>

        {/* TITRE & MARCHANT */}
        <Card variant="elevated" style={styles.headerCard}>
          {/* Pas de badge « vérifié » : aucun champ de vérification marchand dans le contrat.
              Tsévié : lieu réel du jeu de démo (Agro-Intrants Zio), pas un texte générique. */}
          <View style={styles.merchantRow}>
            <Ionicons name="storefront" size={16} color={colors.unlock.green} />
            <Text style={styles.merchantName}>{product.merchant_name}</Text>
            <View style={styles.locationTag}>
              <Ionicons name="location" size={10} color={colors.text.muted} />
              <Text style={styles.locationText}>Tsévié</Text>
            </View>
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
        </Card>

        {/* PRIX DETAIL vs PRIX GROS */}
        <Card variant="elevated" style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Prix au détail (Individuel)</Text>
              <Text style={styles.retailPrice}>{formatFcfa(product.individual_price)} / {product.unit_label}</Text>
            </View>

            <View style={[styles.priceCol, styles.priceColHighlight]}>
              <Text style={styles.priceLabelSuccess}>Meilleur Prix de Gros</Text>
              <Text style={styles.bestPrice}>{formatFcfa(bestTierPrice)} / {product.unit_label}</Text>
            </View>
          </View>
        </Card>

        {/* PALIERS DE PRIX (TIER STEPPER) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={20} color={colors.brand.ink} />
            <Text style={styles.sectionTitle}>Grille de Paliers de Prix</Text>
          </View>

          <Card variant="elevated" style={styles.tiersCard}>
            {product.tiers.map((tier, index) => {
              const isBest = tier.unit_price === bestTierPrice;
              const rangeText = `${tier.min_quantity}${tier.max_quantity ? ` à ${tier.max_quantity}` : '+'} ${product.unit_label}s`;
              
              return (
                <View key={tier.id || index} style={styles.tierItemWrapper}>
                  <TierRow
                    range={rangeText}
                    price={formatFcfa(tier.unit_price)}
                    state={isBest ? 'current' : index === 1 ? 'next' : 'default'}
                  />
                </View>
              );
            })}
          </Card>
        </View>

        {/* GROUPES OUVERTS EN DIRECT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={colors.unlock.green} />
            <Text style={styles.sectionTitle}>Groupes Ouverts Actifs ({product.open_groups.length})</Text>
          </View>

          {product.open_groups.length === 0 ? (
            <Card variant="elevated" style={styles.emptyGroupCard}>
              <EmptyState
                title="Aucun groupe ouvert pour l'instant"
                subtitle="Soyez l'organisateur et lancez le premier groupe d'achat pour ce produit !"
              />
            </Card>
          ) : (
            product.open_groups.map((group) => {
              const progressRatio = Math.min(1, group.current_quantity / group.target_quantity);
              
              return (
                <Pressable key={group.id} onPress={() => router.push(`/g/${group.share_code}`)}>
                  <Card variant="elevated" style={styles.activeGroupCard}>
                    <View style={styles.groupHeaderRow}>
                      <View style={styles.groupTitleCol}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupCode}>Code: {group.share_code}</Text>
                      </View>
                      <Badge label="EN COURS 🔥" tone="brand" />
                    </View>

                    <View style={styles.groupProgressBlock}>
                      <View style={styles.progressTextRow}>
                        <Text style={styles.progressQty}>
                          {group.current_quantity} / {group.target_quantity} {product.unit_label}s
                        </Text>
                        <Text style={styles.groupUnitPrice}>{formatFcfa(group.current_unit_price)}</Text>
                      </View>
                      <ProgressBar value={progressRatio} height={10} />
                    </View>

                    <View style={styles.groupFooterRow}>
                      <Text style={styles.participantsText}>👥 {group.participants_count} participants</Text>
                      <View style={styles.joinBtnPill}>
                        <Text style={styles.joinBtnText}>Rejoindre ➔</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Barre d'action : uniquement s'il existe un vrai groupe à rejoindre. La création de
          groupe n'est pas encore construite (aucune route /g/create) — pointer dessus
          affichait silencieusement les données du groupe de démo sous un autre nom. */}
      {product.open_groups.length > 0 && (
        <View style={styles.stickyActionBar}>
          <Button label="Rejoindre le groupe" onPress={() => router.push(`/g/${product.open_groups[0].share_code}`)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  loadingContainer: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  skeletonImage: { width: 120, height: 120, borderRadius: radii.card, backgroundColor: colors.surface.raised },
  skeletonText: { width: 200, height: 24, marginTop: spacing.md, backgroundColor: colors.surface.raised, borderRadius: radii.block },

  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },

  heroContainer: {
    height: 180,
    backgroundColor: alpha(colors.unlock.green, 0.08),
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha(colors.unlock.green, 0.15),
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '100%', height: '100%' },
  heroBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.alert.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroBadgeText: { color: colors.surface.white, fontWeight: '800', fontSize: 12 },

  headerCard: { padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.surface.white, borderRadius: radii.card, ...shadow.card },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  merchantName: { fontSize: 13, fontWeight: '700', color: colors.unlock.green },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  locationText: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  productTitle: { fontSize: 20, fontWeight: '900', color: colors.brand.ink, marginTop: 2 },
  productDescription: { fontSize: 14, color: colors.text.muted, lineHeight: 20 },

  priceCard: { padding: spacing.lg, backgroundColor: colors.surface.white, borderRadius: radii.card, ...shadow.card },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  priceCol: { flex: 1, gap: 2 },
  priceColHighlight: { borderLeftWidth: 2, borderLeftColor: colors.unlock.green, paddingLeft: spacing.sm },
  priceLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  priceLabelSuccess: { fontSize: 11, color: colors.unlock.green, fontWeight: '800' },
  retailPrice: { fontSize: 15, fontWeight: '700', color: colors.text.muted, textDecorationLine: 'line-through' },
  bestPrice: { fontSize: 18, fontWeight: '900', color: colors.unlock.green },

  section: { gap: spacing.xs, marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.brand.ink },

  tiersCard: { padding: spacing.sm, backgroundColor: colors.surface.white, borderRadius: radii.card, gap: 4, ...shadow.card },
  tierItemWrapper: { marginVertical: 2 },

  emptyGroupCard: { padding: spacing.lg, backgroundColor: colors.surface.white, borderRadius: radii.card },
  activeGroupCard: { padding: spacing.lg, backgroundColor: colors.surface.white, borderRadius: radii.card, gap: spacing.sm, ...shadow.card },
  groupHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  groupTitleCol: { gap: 2 },
  groupName: { fontSize: 15, fontWeight: '800', color: colors.brand.ink },
  groupCode: { fontSize: 12, color: colors.text.muted },

  groupProgressBlock: { gap: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressQty: { fontSize: 13, fontWeight: '700', color: colors.brand.ink },
  groupUnitPrice: { fontSize: 14, fontWeight: '800', color: colors.unlock.green },

  groupFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  participantsText: { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  joinBtnPill: { backgroundColor: colors.brand.yellow, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill },
  joinBtnText: { fontSize: 12, fontWeight: '800', color: colors.brand.ink },

  stickyActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    ...shadow.soft,
  },
  actionButtonHalf: { flex: 1 },
  gradientBtnWrapper: { borderRadius: radii.pill, overflow: 'hidden' },
  primaryGradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: colors.brand.ink },
});

