/**
 * Accueil — catalogue, en-tête « bento ». Aucune donnée inventée : le bloc impact vient
 * du même endpoint /stats/impact que le tableau de bord jury (ImpactStats), pas un
 * chiffre écrit en dur dans l'écran.
 */
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  View,
  StyleSheet,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { CatalogueQuery } from '@shared/api/types';
import { colors, gradients, spacing, radii, shadow, hitSlop } from '@shared/theme/tokens';
import { Text, Card, ProductCard, EmptyState } from '../../components/ui';
import { listProducts, getImpactStats, listNotifications } from '../../lib/api/endpoints';
import { useAuthToken } from '../../lib/hooks/useAuthToken';
import { formatFcfa } from '../../lib/format';

const TRIS: Array<{ valeur: NonNullable<CatalogueQuery['sort']>; label: string }> = [
  { valeur: 'name', label: 'A → Z' },
  { valeur: 'price_asc', label: 'Prix croissant' },
  { valeur: 'price_desc', label: 'Prix décroissant' },
  { valeur: 'groups', label: 'Plus de groupes' },
];

/**
 * Puce de filtre. L'état actif ne repose pas que sur la couleur : le fond, la
 * bordure et la coche changent ensemble — la couleur seule ne doit jamais porter
 * une information.
 */
function Puce({
  label,
  actif,
  icone,
  onPress,
}: {
  label: string;
  actif: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.puce, actif && styles.puceActive]}
    >
      {actif && <Ionicons name="checkmark" size={14} color={colors.brand.ink} />}
      {!actif && icone && <Ionicons name={icone} size={14} color={colors.text.muted} />}
      <Text variant="caption" tone={actif ? 'ink' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AccueilScreen() {
  // L'accueil n'a pas d'AppBar : il porte lui-même l'encart haut, sinon le
  // titre passe sous la barre de statut sur un appareil.
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuthToken();
  const [searchQuery, setSearchQuery] = useState('');
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<NonNullable<CatalogueQuery['sort']>>('name');
  const [avecGroupes, setAvecGroupes] = useState(false);

  // La saisie est temporisée : sans cela, chaque lettre déclenchait une requête.
  useEffect(() => {
    const minuteur = setTimeout(() => setRecherche(searchQuery), 300);
    return () => clearTimeout(minuteur);
  }, [searchQuery]);

  // Recherche et tri sont faits par le serveur : le prix affiché dépend du
  // groupe ouvert le moins cher, que le client n'a pas les moyens de classer.
  const { data: products, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['products', recherche, tri, avecGroupes],
    queryFn: () => listProducts({ q: recherche, sort: tri, with_open_groups: avecGroupes }),
  });

  // Badge in-app : le contrat exclut le push et accepte explicitement ce
  // substitut. Sans jeton la requête n'est pas lancée.
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const nonLues = notifications?.unread_count ?? 0;
  const { data: impact } = useQuery({ queryKey: ['impact-stats'], queryFn: getImpactStats });

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.lg }]}
        data={products ?? []}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.topRow}>
              <Text variant="title">KashFlow</Text>
              <View style={styles.topActions}>
                {isAuthenticated && (
                  <Pressable
                    onPress={() => router.push('/notifications')}
                    accessibilityRole="button"
                    accessibilityLabel={
                      nonLues > 0 ? `Notifications, ${nonLues} non lues` : 'Notifications'
                    }
                    style={styles.profileTouchable}
                  >
                    <Ionicons name="notifications-outline" size={26} color={colors.brand.ink} />
                    {nonLues > 0 && (
                      <View style={styles.badge}>
                        <Text variant="caption" style={styles.badgeText} tabularNums>
                          {nonLues > 9 ? '9+' : nonLues}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push('/profil')}
                  accessibilityRole="button"
                  accessibilityLabel="Profil"
                  style={styles.profileTouchable}
                >
                  <Ionicons name="person-circle-outline" size={28} color={colors.brand.ink} />
                </Pressable>
              </View>
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
                returnKeyType="search"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtres}
            >
              {TRIS.map((option) => (
                <Puce
                  key={option.valeur}
                  actif={tri === option.valeur}
                  label={option.label}
                  onPress={() => setTri(option.valeur)}
                />
              ))}
              <Puce
                actif={avecGroupes}
                icone="people"
                label="Avec groupe ouvert"
                onPress={() => setAvecGroupes((v) => !v)}
              />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : isError ? (
            // Une panne réseau annonçait « Aucun produit trouvé » : le catalogue
            // paraissait vide alors que l'API était simplement injoignable.
            <EmptyState
              title="Catalogue indisponible"
              subtitle={error instanceof Error ? error.message : undefined}
              actionLabel="Réessayer"
              onAction={() => refetch()}
            />
          ) : (
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
  topActions: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.alert.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.surface.white },
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
  filtres: { gap: spacing.sm, paddingVertical: spacing.sm, paddingRight: spacing.xl },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  puceActive: { borderColor: colors.brand.ink, backgroundColor: colors.brand.yellow },
  searchInput: {
    minHeight: 48,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.brand.ink,
    backgroundColor: colors.surface.white,
  },
});
