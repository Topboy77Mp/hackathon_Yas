/**
 * Mes groupes — dérivé de `GET /orders`.
 *
 * Il n'existe pas d'endpoint « mes groupes » au contrat, et il n'en faut pas :
 * un groupe m'appartient exactement quand j'y ai une commande. On déduit donc la
 * liste des commandes, puis on va chercher le détail de chaque groupe pour
 * afficher sa progression réelle — le nombre de groupes d'un acheteur se compte
 * sur les doigts d'une main, la dépense est négligeable.
 */
import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Card, Badge, ProgressBar, AppBar, EmptyState, Divider } from '../../components/ui';
import { getGroup, listOrders } from '../../lib/api/endpoints';
import { formatFcfa, formatCountdown, isDeadlineUrgent, pluralizeUnit } from '../../lib/format';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

export default function MesGroupesScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthToken();

  const { data: orders, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
    enabled: isAuthenticated,
  });

  // Une commande annulée n'ouvre plus droit au groupe : on ne l'affiche pas.
  const groupIds = useMemo(() => {
    const actives = (orders ?? []).filter((o) => o.order_status !== 'CANCELLED');
    return [...new Set(actives.map((o) => o.group_id))];
  }, [orders]);

  const groupQueries = useQueries({
    queries: groupIds.map((id) => ({
      queryKey: ['group', id],
      queryFn: () => getGroup(id),
      enabled: isAuthenticated,
    })),
  });

  if (isAuthLoading) return <View style={styles.screen} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Mes groupes" />
        <EmptyState
          title="Connectez-vous"
          subtitle="Les groupes que vous avez rejoints apparaîtront ici."
          actionLabel="Se connecter"
          onAction={() => router.push('/(auth)/connexion')}
        />
      </View>
    );
  }

  const groups = groupQueries.map((q) => q.data).filter((g) => g !== undefined);

  return (
    <View style={styles.screen}>
      <AppBar title="Mes groupes" />

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />
        }
      >
        {isError && (
          <EmptyState
            title="Groupes indisponibles"
            subtitle={error instanceof Error ? error.message : undefined}
            actionLabel="Réessayer"
            onAction={() => refetch()}
          />
        )}

        {!isLoading && !isError && groupIds.length === 0 && (
          <EmptyState
            title="Vous ne participez à aucun groupe"
            subtitle="Rejoignez-en un pour faire baisser le prix avec d'autres acheteurs."
            actionLabel="Voir le catalogue"
            onAction={() => router.replace('/')}
          />
        )}

        {groups.map((group) => {
          const unite = pluralizeUnit(group.product.unit_label, group.current_quantity);
          const urgent = isDeadlineUrgent(group.seconds_remaining);

          return (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              onPress={() => router.push(`/groupe/${group.id}`)}
            >
              <Card variant="elevated" style={styles.card}>
                <View style={styles.headerRow}>
                  <Text variant="label">{group.name}</Text>
                  <Badge
                    label={
                      group.status === 'OPEN'
                        ? formatCountdown(group.seconds_remaining).replace('Se termine dans ', 'fin dans ')
                        : group.status === 'CANCELLED'
                          ? 'annulé'
                          : 'objectif atteint'
                    }
                    tone={group.status === 'CANCELLED' ? 'urgent' : urgent ? 'urgent' : 'neutral'}
                  />
                </View>

                <Text variant="caption" tone="muted">
                  {group.product.name}
                </Text>

                <ProgressBar value={group.progress_ratio} />

                <View style={styles.line}>
                  <Text variant="label" tabularNums>
                    {group.current_quantity} / {group.target_quantity} {unite}
                  </Text>
                  <Text variant="label" tabularNums>
                    {formatFcfa(group.current_unit_price)}
                  </Text>
                </View>

                {group.my_membership && (
                  // Une View plutôt qu'un Fragment : `Card` de react-native-paper
                  // clone ses enfants directs en leur passant un `index`, qu'un
                  // Fragment rejette avec un avertissement React.
                  <View style={styles.part}>
                    <Divider />
                    <Text variant="caption" tone="muted" tabularNums>
                      Ma part : {group.my_membership.quantity}{' '}
                      {pluralizeUnit(group.product.unit_label, group.my_membership.quantity)} ·{' '}
                      {formatFcfa(group.my_membership.total_amount)}
                    </Text>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surface.white, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  part: { gap: spacing.sm },
});
