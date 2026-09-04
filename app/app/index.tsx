/**
 * Accueil — catalogue, en-tête « bento ». Aucune donnée inventée : le bloc impact vient
 * du même endpoint /stats/impact que le tableau de bord jury (ImpactStats), pas un
 * chiffre écrit en dur dans l'écran.
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, radii, shadow, hitSlop } from '@shared/theme/tokens';
import { Text, Card, ProductCard, EmptyState } from '../components/ui';
import { listProducts, getImpactStats } from '../lib/api/endpoints';
import { formatFcfa } from '../lib/format';

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
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.topRow}>
              <Text variant="title">KashFlow</Text>
              <Pressable
                onPress={() => router.push('/profil')}
                accessibilityRole="button"
                accessibilityLabel="Profil"
                style={styles.profileTouchable}
              >
                <Ionicons name="person-circle-outline" size={28} color={colors.brand.ink} />
              </Pressable>
            </View>

            <Card variant="elevated" style={styles.bentoGreeting}>
              <Text variant="body" tone="muted">
                Regroupez-vous. Débloquez le meilleur prix.
              </Text>
            </Card>

            {impact && (
              <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bentoImpact}>
                <View style={styles.bentoImpactIcon}>
                  <Ionicons name="people" size={20} color={colors.surface.white} />
                </View>
                <View>
                  <Text variant="caption" style={styles.bentoImpactLabel}>
                    Économisé par la communauté
                  </Text>
                  <Text variant="title" style={styles.bentoImpactValue} tabularNums>
                    {formatFcfa(impact.community_savings)}
                  </Text>
                </View>
              </LinearGradient>
            )}

            <View style={styles.searchWrapper}>
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
            bestOpenGroupPrice={item.best_open_group_price ?? undefined}
            openGroupsCount={item.open_groups_count}
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
  headerContainer: { gap: spacing.md, marginBottom: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileTouchable: {
    width: hitSlop.minTouchTarget,
    height: hitSlop.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  bentoGreeting: { backgroundColor: colors.surface.white },
  bentoImpact: {
    borderRadius: radii.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.soft,
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
  searchWrapper: { borderRadius: radii.card, ...shadow.soft },
  searchInput: {
    minHeight: 48,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.brand.ink,
    backgroundColor: colors.surface.white,
  },
});
