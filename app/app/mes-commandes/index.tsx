/**
 * Mes commandes — `GET /orders`.
 *
 * Le montant affiché est celui que l'API renvoie : il bouge quand le groupe
 * franchit un palier, puisque la baisse s'applique rétroactivement à toutes les
 * commandes actives. C'est précisément ce qu'il faut donner à voir, et c'est
 * aussi pourquoi aucun total n'est recalculé ici.
 */
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderStatus, PaymentStatus } from '@shared/api/types';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Card, Badge, Button, AppBar, EmptyState, Divider } from '../../components/ui';
import { listOrders, payOrder } from '../../lib/api/endpoints';
import { formatFcfa, pluralizeUnit } from '../../lib/format';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

const STATUTS: Record<OrderStatus, string> = {
  PENDING: 'En attente de clôture',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
};

const PAIEMENTS: Record<PaymentStatus, string> = {
  PENDING: 'Non débitée',
  SUCCESS: 'Payée',
  FAILED: 'Paiement échoué',
  REFUNDED: 'Remboursée',
};

export default function MesCommandesScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthToken();

  const queryClient = useQueryClient();

  const { data: orders, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
    enabled: isAuthenticated,
  });

  // Paiement mocké, P0 du <perimetre> : PENDING → SUCCESS. L'endpoint existait
  // depuis le début et n'était appelé nulle part.
  const paiement = useMutation({
    mutationFn: (orderId: number) => payOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isAuthLoading) return <View style={styles.screen} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Mes commandes" onBack={() => router.back()} />
        <EmptyState
          title="Connectez-vous"
          subtitle="Vos commandes apparaîtront ici."
          actionLabel="Se connecter"
          onAction={() => router.push('/(auth)/connexion')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBar title="Mes commandes" onBack={() => router.back()} />

      {isError && (
        <EmptyState
          title="Commandes indisponibles"
          subtitle={error instanceof Error ? error.message : undefined}
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      )}

      <FlatList
        contentContainerStyle={styles.list}
        data={orders ?? []}
        keyExtractor={(order) => String(order.id)}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />
        }
        ListEmptyComponent={
          isLoading || isError ? null : (
            <EmptyState
              title="Aucune commande pour l'instant"
              subtitle="Rejoignez un groupe pour faire baisser le prix avec d'autres acheteurs."
              actionLabel="Voir le catalogue"
              onAction={() => router.replace('/')}
            />
          )
        }
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() => router.push(`/groupe/${item.group_id}`)}
            onPay={() => paiement.mutate(item.id)}
            isPaying={paiement.isPending && paiement.variables === item.id}
            payError={
              paiement.isError && paiement.variables === item.id && paiement.error instanceof Error
                ? paiement.error.message
                : null
            }
          />
        )}
      />
    </View>
  );
}

function OrderRow({
  order,
  onPress,
  onPay,
  isPaying,
  payError,
}: {
  order: Order;
  onPress: () => void;
  onPay: () => void;
  isPaying: boolean;
  payError: string | null;
}) {
  const unite = pluralizeUnit(order.unit_label, order.quantity);

  return (
    <Card variant="elevated" style={styles.card}>
        <View style={styles.headerRow}>
          <Text variant="label">{order.product_name}</Text>
          <Badge
            label={STATUTS[order.order_status]}
            tone={order.order_status === 'CANCELLED' ? 'urgent' : 'neutral'}
          />
        </View>

        <Text variant="caption" tone="muted">
          {order.group_name}
        </Text>

        <Divider />

        <View style={styles.line}>
          <Text variant="body" tone="muted">
            {order.quantity} {unite} × {formatFcfa(order.unit_price)}
          </Text>
          <Text variant="heading" tabularNums>
            {formatFcfa(order.total_amount)}
          </Text>
        </View>

        {order.saving > 0 && (
          <Text variant="label" tone="success" tabularNums>
            {formatFcfa(order.saving)} économisés sur le prix de détail
          </Text>
        )}

        <Text variant="caption" tone="muted">
          {PAIEMENTS[order.payment_status]}
        </Text>

        {payError && (
          <Text variant="label" tone="alert">
            {payError}
          </Text>
        )}

      <View style={styles.actions}>
        <Button label="Voir le groupe" variant="ghost" fullWidth={false} onPress={onPress} />
        {order.order_status !== 'CANCELLED' && order.payment_status !== 'SUCCESS' && (
          <View style={styles.actionPrimary}>
            <Button
              label={isPaying ? 'Paiement…' : `Régler ${formatFcfa(order.total_amount)}`}
              loading={isPaying}
              onPress={onPay}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surface.white, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actionPrimary: { flex: 1 },
});
