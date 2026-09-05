/**
 * Notifications — `GET /notifications`.
 *
 * Le contrat exclut le push et précise que « une liste de notifications en base
 * + badge in-app suffit ». La liste existait côté serveur depuis le début, écrite
 * au franchissement de palier et à l'annulation d'un groupe ; rien ne la lisait.
 */
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useRetour } from '../../lib/hooks/useRetour';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { Notification } from '@shared/api/types';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Card, AppBar, EmptyState } from '../../components/ui';
import { listNotifications, markNotificationRead } from '../../lib/api/endpoints';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  TIER_UNLOCKED: 'trending-down',
  GROUP_CANCELLED: 'close-circle',
  GROUP_COMPLETED: 'checkmark-circle',
  PAYMENT_CONFIRMED: 'card',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const retour = useRetour();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authEnCours } = useAuthToken();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    enabled: isAuthenticated,
  });

  const lecture = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (authEnCours) return <View style={styles.screen} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Notifications" onBack={retour} />
        <EmptyState
          title="Connectez-vous"
          subtitle="Vous serez prévenu dès qu'un palier est débloqué dans vos groupes."
          actionLabel="Se connecter"
          onAction={() => router.push('/(auth)/connexion')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBar title="Notifications" onBack={retour} />

      {isError && (
        <EmptyState
          title="Notifications indisponibles"
          subtitle={error instanceof Error ? error.message : undefined}
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      )}

      <FlatList
        contentContainerStyle={styles.list}
        data={data?.notifications ?? []}
        keyExtractor={(n) => String(n.id)}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brand.ink} />
        }
        ListEmptyComponent={
          isLoading || isError ? null : (
            <EmptyState
              title="Aucune notification"
              subtitle="Vous serez prévenu ici dès qu'un palier tombe dans l'un de vos groupes."
            />
          )
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} onRead={() => lecture.mutate(item.id)} />
        )}
      />
    </View>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notification.read ? notification.title : `${notification.title}, non lue`}
      onPress={notification.read ? undefined : onRead}
    >
      <Card variant="elevated" style={[styles.card, !notification.read && styles.cardUnread]}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons
              name={ICONES[notification.type] ?? 'notifications'}
              size={18}
              color={notification.read ? colors.text.muted : colors.unlock.green}
            />
          </View>
          <View style={styles.body}>
            <Text variant="label">{notification.title}</Text>
            <Text variant="caption" tone="muted">
              {notification.message}
            </Text>
            {!notification.read && (
              <Text variant="caption" tone="success">
                Toucher pour marquer comme lue
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surface.white },
  cardUnread: { borderLeftWidth: spacing.xs, borderLeftColor: colors.brand.yellow },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
