/**
 * KashFlow — Polling de l'écran groupe (D6 : GET /groups/{id} toutes les 2s au premier plan).
 * Détecte le franchissement de palier en comparant current_tier entre deux réponses, pour
 * déclencher la séquence d'animation unique décrite dans docs/design/motion.md.
 */
import { useQuery, type QueryKey } from '@tanstack/react-query';
// Depuis SDK 56, expo-router n'est plus compatible avec @react-navigation/native :
// mêmes hooks, nouveau point d'entrée (cf. docs/router/migrate/sdk-55-to-56).
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import type { GroupDetail } from '@shared/api/types';
import { GROUP_POLL_INTERVAL_MS } from '../config';

export function useGroupPolling(queryKey: QueryKey, fetcher: () => Promise<GroupDetail>) {
  const isFocused = useIsFocused();
  const previousTierMinQuantity = useRef<number | null>(null);
  const [tierJustUnlocked, setTierJustUnlocked] = useState(false);

  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    refetchInterval: isFocused ? GROUP_POLL_INTERVAL_MS : false,
    enabled: isFocused,
  });

  useEffect(() => {
    const currentMin = query.data?.current_tier.min_quantity ?? null;
    if (
      previousTierMinQuantity.current !== null &&
      currentMin !== null &&
      currentMin !== previousTierMinQuantity.current
    ) {
      setTierJustUnlocked(true);
    }
    if (currentMin !== null) previousTierMinQuantity.current = currentMin;
  }, [query.data?.current_tier.min_quantity]);

  const acknowledgeTierUnlock = () => setTierJustUnlocked(false);

  return { ...query, tierJustUnlocked, acknowledgeTierUnlock };
}
