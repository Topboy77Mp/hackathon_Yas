/**
 * Accueil — catalogue. Écran non spécifié en détail par AGENT_UI en Phase 1A
 * (seul l'écran groupe l'est) : liste minimale, avec les composants primitifs.
 * Aucune donnée inventée : pas de KPI ni de palier affiché ici qui ne vienne
 * pas du payload (ProductCard n'a ni catégorie, ni palier, ni pourcentage —
 * ces informations vivent dans ProductDetail, affichées sur la fiche produit).
 */
import { useMemo, useState } from 'react';
import { FlatList, View, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, ProductCard, EmptyState } from '../components/ui';
import { listProducts } from '../lib/api/endpoints';

export default function AccueilScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  });

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
            <Text variant="title">KashFlow</Text>
            <Text variant="body" tone="muted">
              Regroupez-vous. Débloquez le meilleur prix.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Chercher un produit"
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Chercher un produit"
            />
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
            onPress={() => router.push(`/produit/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  headerContainer: { gap: spacing.sm, marginBottom: spacing.xl },
  searchInput: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.block,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.brand.ink,
    backgroundColor: colors.surface.white,
  },
});
