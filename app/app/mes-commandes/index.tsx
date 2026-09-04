import { useRouter } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function MesCommandesScreen() {
  const router = useRouter();
  return <ScreenStub title="Mes commandes" onBack={() => router.back()} />;
}
