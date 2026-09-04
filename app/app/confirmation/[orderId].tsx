import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function ConfirmationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  return <ScreenStub title="Confirmation" subtitle={`Commande ${orderId}`} onBack={() => router.back()} />;
}
