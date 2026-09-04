import { useLocalSearchParams } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function PartagerScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <ScreenStub title="Partager" subtitle={`Groupe ${groupId}`} />;
}
