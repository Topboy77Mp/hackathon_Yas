/**
 * KashFlow — Écran groupe.
 * Aligné sur la maquette v2 : en-tête de groupe, prix dominant, progression,
 * grille de paliers, participants, point de retrait, barre d'action fixe.
 * Aucun calcul de prix : tout vient tel quel du payload GroupDetail (D3).
 */
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { QueryKey } from '@tanstack/react-query';
import type { GroupDetail } from '@shared/api/types';
import { colors, spacing, radii } from '@shared/theme/tokens';
import {
  Text,
  Button,
  Card,
  Divider,
  Badge,
  ProgressBar,
  PriceDisplay,
  CounterDisplay,
  TierRow,
  AppBar,
  EmptyState,
} from '../../components/ui';
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
        <View style={styles.scrollContent}>
          <View style={[styles.skeleton, { height: 20, width: 200 }]} />
          <View style={[styles.skeleton, { height: 48, width: 240, marginTop: spacing.lg }]} />
          <View style={[styles.skeleton, { height: 12, width: '100%', marginTop: spacing.xl, borderRadius: radii.pill }]} />
          <View style={[styles.skeleton, { height: 120, width: '100%', marginTop: spacing.xl }]} />
        </View>
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
  const joined = group.my_membership?.joined ?? false;

  return (
    <View style={styles.screen}>
      <AppBar
        title={group.name}
        subtitle={`Code ${group.share_code} · ${group.product.name}`}
        onBack={() => router.back()}
        right={
          <Badge
            label={formatCountdown(group.seconds_remaining).replace('Se termine dans ', 'fin dans ')}
            tone={urgent ? 'urgent' : 'neutral'}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {isTerminal && (
          <Card variant="raised">
            <Text variant="label">{group.status === 'COMPLETED' ? 'Groupe complet' : 'Groupe verrouillé'}</Text>
          </Card>
        )}

        {/* La seule chose importante de l'écran */}
        <View style={styles.priceBlock}>
          <Text variant="label" tone="muted">
            prix actuel pour tout le groupe
          </Text>
          <PriceDisplay
            value={group.current_unit_price}
            previousValue={previousUnitPrice}
            highlightChange={showUnlockBanner}
          />
          <Text variant="label" tone="muted">
            par {unitLabel}, au lieu de {formatFcfa(group.product.individual_price)}
          </Text>
        </View>

        <View style={styles.progressBlock}>
          <ProgressBar value={group.progress_ratio} />
          <View style={styles.progressLabels}>
            <View style={styles.inlineRow}>
              <CounterDisplay value={group.current_quantity} variant="label" />
              <Text variant="label" tabularNums>
                / {group.target_quantity} {unitLabelPlural}
              </Text>
            </View>
            {group.quantity_to_next_tier !== null ? (
              <Text variant="label" tone="muted">
                il manque {group.quantity_to_next_tier} {unitLabelPlural}
              </Text>
            ) : (
              <Text variant="label" tone="success">
                objectif atteint
              </Text>
            )}
          </View>
          {showUnlockBanner && (
            <Text variant="label" tone="success">
              Palier débloqué. Tout le groupe passe à {formatFcfa(group.current_unit_price)}.
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="label">Paliers</Text>
          <TierRow
            range={`${group.current_tier.min_quantity} ${unitLabelPlural} et plus`}
            price={formatFcfa(group.current_tier.unit_price)}
            state="current"
          />
          {group.next_tier && (
            <TierRow
              range={`${group.next_tier.min_quantity} ${unitLabelPlural} et plus`}
              price={formatFcfa(group.next_tier.unit_price)}
              state="next"
            />
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="label">
            {group.participants_count} participants
          </Text>
          <Text variant="caption" tone="muted">
            économie du groupe : {formatFcfa(group.group_total_saving)}
          </Text>
        </View>

        <Card variant="raised" style={styles.section}>
          <Text variant="label">Retrait</Text>
          <Text variant="label" tone="muted">
            {group.product.merchant_name}. À partir de la clôture du groupe.
          </Text>
        </Card>

        {joined && group.my_membership && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.section}>
              <Text variant="heading">Ma participation</Text>
              <Text variant="body">
                {group.my_membership.quantity} {unitLabelPlural} commandés · {formatFcfa(group.my_membership.total_amount)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {!isTerminal && (
        <View style={styles.actionBar}>
          {joined ? (
            <>
              <Button
                label="Voir ma commande"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push(`/confirmation/${group.my_membership!.order_id}`)}
              />
              <View style={styles.actionBarPrimary}>
                <Button label="Inviter" onPress={() => router.push(`/partager/${group.id}`)} />
              </View>
            </>
          ) : (
            <>
              <Button
                label="Inviter"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push(`/partager/${group.id}`)}
              />
              <View style={styles.actionBarPrimary}>
                <Button
                  label="Rejoindre"
                  onPress={() =>
                    isAuthenticated
                      ? router.push(`/rejoindre/${group.id}`)
                      : router.push({ pathname: '/(auth)/inscription', params: { redirectTo: `/g/${group.share_code}` } })
                  }
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xs },
  skeleton: { backgroundColor: colors.surface.raised, borderRadius: radii.block },
  priceBlock: { gap: spacing.sm, marginTop: spacing.sm },
  progressBlock: { marginTop: spacing.xl, gap: spacing.md },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  divider: { marginVertical: spacing.xl },
  section: { gap: spacing.sm },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  actionBarPrimary: { flex: 1 },
});
