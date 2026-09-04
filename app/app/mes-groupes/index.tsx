import { useRouter } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function MesGroupesScreen() {
  const router = useRouter();
  return <ScreenStub title="Mes groupes" onBack={() => router.back()} />;
}
