import { useLocalSearchParams } from 'expo-router';
import { GroupScreen } from '../../features/groupe/GroupScreen';
import { getGroup } from '../../lib/api/endpoints';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

export default function GroupeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { isAuthenticated } = useAuthToken();

  return (
    <GroupScreen
      queryKey={['group', groupId]}
      fetcher={() => getGroup(groupId)}
      isAuthenticated={isAuthenticated}
    />
  );
}
