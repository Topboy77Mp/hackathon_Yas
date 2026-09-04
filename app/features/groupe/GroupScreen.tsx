/**
 * KashFlow — Écran groupe.
 * Implémente la hiérarchie, les libellés et les états décrits dans docs/design/screens.md,
 * avec les composants primitifs d'AGENT_UI. Aucun calcul de prix : tout vient tel quel du
 * payload GroupDetail (D3).
 */
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { QueryKey } from '@tanstack/react-query';
import type { GroupDetail } from '@shared/api/types';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Button, Card, ProgressBar, PriceDisplay, CounterDisplay, EmptyState } from '../../components/ui';
import { useGroupPolling } from '../../lib/hooks/useGroupPolling';
import { formatFcfa, formatCountdown, isDeadlineUrgent, pluralizeUnit } from '../../lib/format';

interface GroupScreenProps {
  queryKey: QueryKey;
  fetcher: () => Promise<GroupDetail>;
  /** Un visiteur non connecté voit le même écran ; seul le CTA change (cf. screens.md). */
  isAuthenticated: boolean;
}

const UNLOCK_BANNER_DURATION_MS = 4000;

export function GroupScreen({ queryKey, fetcher, isAuthenticated }: GroupScreenProps) {
  const router = useRouter();
  const { data: group, isLoading, isError, refetch, tierJustUnlocked, acknowledgeTierUnlock } =
    useGroupPolling(queryKey, fetcher);

  const [showUnlockBanner, setShowUnlockBanner] = useState(false);
  const previousUnitPriceRef = useRef<number | undefined>(undefined);
  const previousUnitPrice = previousUnitPriceRef.current;

  useEffect(() => {
    if (group) previousUnitPriceRef.current = group.current_unit_price;
  }, [group?.current_unit_price]);

  useEffect(() => {
    if (!tierJustUnlocked) return;
    setShowUnlockBanner(true);
    acknowledgeTierUnlock();
    const timeout = setTimeout(() => setShowUnlockBanner(false), UNLOCK_BANNER_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [tierJustUnlocked, acknowledgeTierUnlock]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.skeletonBlock, { height: 48, width: 220, marginTop: spacing.xxl }]} />
        <View style={[styles.skeletonBlock, { height: 16, width: 120, marginTop: spacing.sm }]} />
        <View style={[styles.skeletonBlock, { height: 12, width: '100%', marginTop: spacing.xl, borderRadius: radii.pill }]} />
        <View style={[styles.skeletonBlock, { height: 80, width: '100%', marginTop: spacing.xl }]} />
      </View>
    );
  }

  if (isError || !group) {
    return (
      <View style={styles.screen}>
        <EmptyState title="Connexion impossible" actionLabel="Réessayer" onAction={() => refetch()} />
      </View>
    );
  }

  if (group.status === 'CANCELLED') {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Ce groupe n'a pas atteint son objectif minimum avant la date limite."
          subtitle={group.my_membership?.joined ? 'Commande annulée, aucun débit effectué.' : undefined}
          actionLabel="Voir des groupes similaires"
          onAction={() => router.push(`/produit/${group.product.id}`)}
        />
      </View>
    );
  }

  const unitLabel = group.product.unit_label;
  const unitLabelPlural = pluralizeUnit(unitLabel, group.current_quantity);
  const urgent = isDeadlineUrgent(group.seconds_remaining);
  const isTerminal = group.status === 'LOCKED' || group.status === 'COMPLETED';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="caption" tone="muted">
          {group.product.name} · {group.product.merchant_name}
        </Text>

        {isTerminal && (
          <Card variant="raised" style={styles.statusBanner}>
            <Text variant="label">{group.status === 'COMPLETED' ? 'Groupe complet' : 'Groupe verrouillé'}</Text>
          </Card>
        )}

        {showUnlockBanner && (
          <View style={styles.unlockBanner}>
            <Text variant="label" tone="success">
              Palier débloqué · nouveau prix pour tout le groupe
            </Text>
          </View>
        )}

        <View style={styles.priceBlock}>
          <PriceDisplay
            value={group.current_unit_price}
            previousValue={previousUnitPrice}
            unitLabel={`le ${unitLabel}`}
            highlightChange={showUnlockBanner}
          />
        </View>

        <View style={styles.progressBlock}>
          <ProgressBar value={group.progress_ratio} />
          <View style={styles.progressLabels}>
            <CounterDisplay value={group.current_quantity} variant="label" />
            <Text variant="label" tabularNums>
              / {group.target_quantity}
            </Text>
          </View>
        </View>

        <Text variant="caption" tone="muted">
          {group.participants_count} participants · {group.current_quantity} {unitLabelPlural}
        </Text>

        {group.next_tier && group.quantity_to_next_tier !== null ? (
          <>
            <Text variant="heading" style={styles.spacedTop}>
              Il manque {group.quantity_to_next_tier} {unitLabelPlural}
            </Text>
            <Text variant="body" tone="muted">
              pour débloquer le prochain prix
            </Text>

            <Card style={styles.spacedTop}>
              <Text variant="label">Prochain palier</Text>
              <Text variant="body">
                {formatFcfa(group.next_tier.unit_price)} le {unitLabel} à partir de {group.next_tier.min_quantity} {unitLabelPlural}
              </Text>
              <Text variant="body" tone="muted">
                Économie potentielle : {formatFcfa(group.potential_unit_saving)}/{unitLabel}
              </Text>
            </Card>
          </>
        ) : (
          <Card style={styles.spacedTop}>
            <Text variant="label">Dernier prix atteint · palier maximal débloqué</Text>
          </Card>
        )}

        <Text variant="label" tone={urgent ? 'alert' : 'muted'} style={styles.spacedTop} tabularNums>
          {formatCountdown(group.seconds_remaining)}
        </Text>

        {group.my_membership?.joined && (
          <View style={styles.membershipBlock}>
            <Text variant="heading">Ma participation</Text>
            <Text variant="body">
              {group.my_membership.quantity} {unitLabelPlural} commandés · {formatFcfa(group.my_membership.total_amount)}
            </Text>
          </View>
        )}
      </ScrollView>

      {!isTerminal && (
        <View style={styles.actionBar}>
          {group.my_membership?.joined ? (
            <>
              <Button
                label="Voir ma commande"
                variant="ghost"
                fullWidth={false}
                onPress={() => router.push(`/confirmation/${group.my_membership!.order_id}`)}
              />
              <View style={styles.actionBarPrimary}>
                <Button label="Inviter des proches" onPress={() => router.push(`/partager/${group.id}`)} />
              </View>
            </>
          ) : (
            <View style={styles.actionBarPrimary}>
              <Button
                label="Rejoindre le groupe"
                onPress={() =>
                  isAuthenticated
                    ? router.push(`/rejoindre/${group.id}`)
                    : router.push({ pathname: '/(auth)/inscription', params: { redirectTo: `/g/${group.share_code}` } })
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xs },
  skeletonBlock: { backgroundColor: colors.surface.raised, borderRadius: radii.block },
  priceBlock: { marginTop: spacing.sm },
  progressBlock: { marginTop: spacing.xl, gap: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  spacedTop: { marginTop: spacing.xl },
  statusBanner: { marginTop: spacing.md },
  unlockBanner: {
    backgroundColor: colors.unlock.greenSoft,
    borderRadius: radii.block,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  membershipBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  actionBarPrimary: { flex: 1 },
});
