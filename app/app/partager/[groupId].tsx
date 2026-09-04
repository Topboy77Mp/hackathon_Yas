import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function PartagerScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  return <ScreenStub title="Partager" subtitle={`Groupe ${groupId}`} onBack={() => router.back()} />;
}
