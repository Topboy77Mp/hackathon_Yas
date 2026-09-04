import { useRouter } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function ProfilScreen() {
  const router = useRouter();
  return <ScreenStub title="Profil" onBack={() => router.back()} />;
}
