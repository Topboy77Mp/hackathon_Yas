/**
 * Accueil — catalogue, en-tête « Energetic Bento ». Aucune donnée inventée : le bloc
 * impact vient du même endpoint /stats/impact que le tableau de bord jury, et les
 * cartes produit n'affichent une progression ou un prix de groupe que quand un vrai
 * groupe existe (best_open_group_price est undefined pour 2 des 3 produits démo).
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, radii, shadow, hitSlop, alpha } from '@shared/theme/tokens';
import { Text, Card, ProductCard, EmptyState } from '../components/ui';
import { listProducts, getImpactStats } from '../lib/api/endpoints';
import { formatFcfa } from '../lib/format';

/** Icône décorative par produit connu du catalogue démo — pas une catégorie du contrat. */
function iconForProduct(id: string): keyof typeof Ionicons.glyphMap {
  if (id.includes('npk')) return 'leaf';
  if (id.includes('semences')) return 'nutrition';
  return 'school';
}

export default function AccueilScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  });
  const { data: impact } = useQuery({ queryKey: ['impact-stats'], queryFn: getImpactStats });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, searchQuery]);

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Grille bento asymétrique : badge marque (large) + profil (compact) */}
            <View style={styles.topRow}>
              <View style={styles.brandBadge}>
                <Ionicons name="flash" size={16} color={colors.brand.ink} />
                <Text variant="heading" style={styles.brandBadgeText}>
                  KashFlow
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/profil')}
                accessibilityRole="button"
                accessibilityLabel="Profil"
                style={styles.profileTouchable}
              >
                <Ionicons name="person-circle-outline" size={30} color={colors.brand.ink} />
              </Pressable>
            </View>

            {/* Tsévié : lieu réel du commerçant du jeu de démo (Agro-Intrants Zio),
                pas une géolocalisation utilisateur qu'on n'a pas. */}
            <View style={styles.locationPill}>
              <Ionicons name="location-sharp" size={12} color={colors.unlock.green} />
              <Text variant="caption" style={styles.locationText}>
                Tsévié, Togo
              </Text>
            </View>

            <Card variant="elevated" style={styles.bentoGreeting}>
              <Text variant="body" tone="muted">
                Regroupez-vous. Débloquez le meilleur prix.
              </Text>
            </Card>

            {impact && (
              <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bentoImpact}>
                {/* Glow : icône géante en arrière-plan, opacité 0.1, casse le plat du dégradé */}
                <Ionicons name="trending-up" size={120} color="rgba(255,255,255,0.1)" style={styles.bentoImpactGlow} />

                <View style={styles.bentoImpactIcon}>
                  <Ionicons name="people" size={20} color={colors.surface.white} />
                </View>
                <View>
                  <Text variant="caption" style={styles.bentoImpactLabel}>
                    Économisé par la communauté
                  </Text>
                  <Text variant="title" style={styles.bentoImpactValue} tabularNums>
                    {formatFcfa(impact.total_savings)}
                  </Text>
                </View>
              </LinearGradient>
            )}

            {/* Barre de recherche « flottante » : ombre marquée + chevauchement du bloc impact */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={colors.text.muted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Chercher un produit"
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Chercher un produit"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              title="Aucun produit trouvé"
              subtitle={searchQuery ? 'Essayez une autre recherche.' : "Aucun produit n'est disponible pour l'instant."}
            />
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            name={item.name}
            merchantName={item.merchant_name}
            individualPrice={item.individual_price}
            unitLabel={item.unit_label}
            bestOpenGroupPrice={item.best_open_group_price}
            openGroupsCount={item.open_groups_count}
            bestOpenGroupCurrentQuantity={item.best_open_group_current_quantity}
            bestOpenGroupTargetQuantity={item.best_open_group_target_quantity}
            iconName={iconForProduct(item.id)}
            onPress={() => router.push(`/produit/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  headerContainer: { gap: spacing.md, marginBottom: spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    ...shadow.soft,
  },
  brandBadgeText: { color: colors.brand.ink },
  profileTouchable: {
    width: hitSlop.minTouchTarget,
    height: hitSlop.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: alpha(colors.unlock.green, 0.1),
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  locationText: { color: colors.unlock.green },
  bentoGreeting: { backgroundColor: colors.surface.white },
  bentoImpact: {
    borderRadius: radii.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    ...shadow.soft,
  },
  bentoImpactGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
  },
  bentoImpactIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoImpactLabel: { color: 'rgba(255,255,255,0.85)' },
  bentoImpactValue: { color: colors.surface.white },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    backgroundColor: colors.surface.white,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    marginTop: -spacing.xl,
    marginHorizontal: spacing.sm,
    ...shadow.card,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.brand.ink },
});
