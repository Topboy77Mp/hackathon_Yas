/**
 * KashFlow — Écran groupe.
 * Contrat v2 : fond d'écran teinté (surface.page), cartes « objet » en relief (radius 24 +
 * ombre douce), preuve sociale (avatars anonymes empilés — GroupDetail ne donne qu'un
 * participants_count, jamais de nom : aucune identité inventée, juste des silhouettes
 * génériques). Aucun calcul de prix : tout vient tel quel du payload GroupDetail (D3).
 */
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
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
import { leaveGroup } from '../../lib/api/endpoints';
import { formatFcfa, formatCountdown, isDeadlineUrgent, pluralizeUnit } from '../../lib/format';

interface GroupScreenProps {
  queryKey: QueryKey;
  fetcher: () => Promise<GroupDetail>;
  /** Un visiteur non connecté voit le même écran ; seul le CTA change (cf. screens.md). */
  isAuthenticated: boolean;
}

const UNLOCK_BANNER_DURATION_MS = 4000;
const NEARLY_FULL_THRESHOLD = 0.9;
const AVATAR_STACK_MAX = 4;

/** Silhouettes anonymes empilées — jamais d'initiales : pas de nom dans le contrat. */
function ParticipantsStack({ count }: { count: number }) {
  const shown = Math.min(AVATAR_STACK_MAX, count);
  const overflow = count - shown;
  return (
    <View style={styles.avatarStack}>
      {Array.from({ length: shown }).map((_, i) => (
        <View key={i} style={[styles.avatarCircle, i > 0 && styles.avatarOverlap]}>
          <Ionicons name="person" size={16} color={colors.text.muted} />
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.avatarCircle, styles.avatarOverlap, styles.avatarOverflow]}>
          <Text variant="label" style={styles.avatarOverflowText}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

export function GroupScreen({ queryKey, fetcher, isAuthenticated }: GroupScreenProps) {
  const router = useRouter();
  const { data: group, isLoading, isError, refetch, tierJustUnlocked, acknowledgeTierUnlock } =
    useGroupPolling(queryKey, fetcher);

  const queryClient = useQueryClient();
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);
  const [erreurSortie, setErreurSortie] = useState<string | null>(null);

  // « Quitter » est P0 au contrat et n'existait nulle part : une commande passée
  // était définitive côté interface, alors que l'API sait l'annuler et
  // repositionner le prix du groupe pour tout le monde.
  const sortie = useMutation({
    mutationFn: (id: number) => leaveGroup(id),
    onSuccess: ({ group: apres }) => {
      queryClient.setQueryData(queryKey, apres);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (raison) =>
      setErreurSortie(raison instanceof Error ? raison.message : 'Impossible de quitter le groupe.'),
  });

  function demanderSortie(id: number) {
    setErreurSortie(null);
    const message = 'Votre commande sera annulée. Le prix du groupe peut remonter pour les autres participants.';
    // `Alert` n'existe pas sur react-native-web : sans ce garde-fou, le bouton
    // ne faisait rien du tout dans le navigateur.
    if (Platform.OS === 'web') {
      if (window.confirm(`Quitter ce groupe ?\n\n${message}`)) sortie.mutate(id);
      return;
    }
    Alert.alert('Quitter ce groupe ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => sortie.mutate(id) },
    ]);
  }
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
  const nearlyFull = group.progress_ratio >= NEARLY_FULL_THRESHOLD && group.progress_ratio < 1;

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
          <Card variant="elevated" style={styles.cardSpacing}>
            <Text variant="label">{group.status === 'COMPLETED' ? 'Groupe complet' : 'Groupe verrouillé'}</Text>
          </Card>
        )}

        {/* La carte la plus importante de l'écran */}
        <Card variant="elevated" style={styles.heroCard}>
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
            {nearlyFull && (
              <Badge label="Presque rempli !" tone="brand" />
            )}
            {showUnlockBanner && (
              <Text variant="label" tone="success">
                Palier débloqué. Tout le groupe passe à {formatFcfa(group.current_unit_price)}.
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.participantsRow}>
            <ParticipantsStack count={group.participants_count} />
            <View style={styles.participantsInfo}>
              <Text variant="label">{group.participants_count} participants</Text>
              <Text variant="caption" tone="muted">
                économie du groupe : {formatFcfa(group.group_total_saving)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Grille complète : `tiers[]` a été ajouté au payload précisément pour
            que cet écran n'ait pas à faire un second appel. Le palier en vigueur
            et le suivant restent mis en évidence. */}
        <Card variant="elevated" style={styles.cardSpacing}>
          <Text variant="label">Paliers</Text>
          <View style={styles.tierList}>
            {group.tiers.map((tier) => (
              <TierRow
                key={tier.min_quantity}
                range={
                  tier.max_quantity === null
                    ? `${tier.min_quantity} ${unitLabelPlural} et plus`
                    : `${tier.min_quantity}–${tier.max_quantity} ${unitLabelPlural}`
                }
                price={formatFcfa(tier.unit_price)}
                state={
                  tier.min_quantity === group.current_tier.min_quantity
                    ? 'current'
                    : tier.min_quantity === group.next_tier?.min_quantity
                      ? 'next'
                      : 'default'
                }
              />
            ))}
          </View>
        </Card>

        <Card variant="elevated" style={styles.cardSpacing}>
          <Text variant="label">Retrait</Text>
          <Text variant="label" tone="muted">
            {group.product.merchant_name}. À partir de la clôture du groupe.
          </Text>
        </Card>

        {joined && group.my_membership && (
          <Card variant="elevated" style={styles.cardSpacing}>
            <Text variant="heading">Ma participation</Text>
            <Text variant="body">
              {group.my_membership.quantity} {unitLabelPlural} commandés · {formatFcfa(group.my_membership.total_amount)}
            </Text>
            {erreurSortie && (
              <Text variant="label" tone="alert">
                {erreurSortie}
              </Text>
            )}
            <Button
              label={sortie.isPending ? 'Annulation…' : 'Quitter le groupe'}
              variant="ghost"
              fullWidth={false}
              loading={sortie.isPending}
              onPress={() => demanderSortie(group.id)}
            />
          </Card>
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
                      : router.push({
                          pathname: '/(auth)/inscription',
                          params: { redirectTo: `/g/${group.share_code}`, groupName: group.name },
                        })
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
  screen: { flex: 1, backgroundColor: colors.surface.page },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  skeleton: { backgroundColor: colors.surface.raised, borderRadius: radii.block },
  heroCard: { backgroundColor: colors.surface.white, gap: spacing.sm },
  cardSpacing: { backgroundColor: colors.surface.white, gap: spacing.sm },
  progressBlock: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, width: '100%' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  divider: { marginVertical: spacing.xs },
  tierList: { gap: spacing.xs },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  participantsInfo: { gap: 2 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.raised,
    borderWidth: 2,
    borderColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: { marginLeft: -10 },
  avatarOverflow: { backgroundColor: colors.brand.ink },
  avatarOverflowText: { color: colors.surface.white },
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
