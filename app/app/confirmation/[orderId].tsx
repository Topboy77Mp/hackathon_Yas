import { useLocalSearchParams } from 'expo-router';
import { ScreenStub } from '../../features/shared/ScreenStub';

export default function ConfirmationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  return <ScreenStub title="Confirmation" subtitle={`Commande ${orderId}`} />;
}
