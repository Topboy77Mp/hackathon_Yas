/**
 * Groupe en vue publique : accessible sans compte via un lien partagé (WhatsApp).
 * Même écran que /groupe/{id} (cf. exigence AGENT_FRONT), résolu par share_code.
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupScreen } from '../../features/groupe/GroupScreen';
import { getGroupByShareCode } from '../../lib/api/endpoints';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

export default function GroupePublicRoute() {
  const { shareCode } = useLocalSearchParams<{ shareCode: string }>();
  const { isAuthenticated } = useAuthToken();

  return (
    <GroupScreen
      queryKey={['group', 'code', shareCode]}
      fetcher={() => getGroupByShareCode(shareCode)}
      isAuthenticated={isAuthenticated}
    />
  );
}
