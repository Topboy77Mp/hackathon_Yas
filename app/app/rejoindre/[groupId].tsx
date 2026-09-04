/**
 * Feuille modale « Rejoindre » : quantité + point de retrait. Écran non détaillé par
 * AGENT_UI en Phase 1A (seul l'écran groupe l'est) : version fonctionnelle minimale.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { spacing } from '@shared/theme/tokens';
import { Text, Field, Button, Sheet } from '../../components/ui';
import { joinGroup } from '../../lib/api/endpoints';

export default function RejoindreScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('1');

  const mutation = useMutation({
    mutationFn: () => joinGroup(groupId, { quantity: Number(quantity) || 1 }),
    onSuccess: ({ order, group }) => {
      queryClient.setQueryData(['group', groupId], group);
      router.replace({
        pathname: '/confirmation/[orderId]',
        params: {
          orderId: order.id,
          groupId: group.id,
          shareCode: group.share_code,
          productName: group.product.name,
          unitLabel: group.product.unit_label,
          quantity: String(order.quantity),
          unitPrice: String(order.unit_price),
          totalAmount: String(order.total_amount),
        },
      });
    },
  });

  return (
    <Sheet title="Combien de sacs voulez-vous commander ?" onClose={() => router.back()}>
      <Field
        label="Quantité"
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
      />

      {mutation.isError && (
        <Text variant="label" tone="alert">
          La commande n'a pas pu être créée. Réessayez.
        </Text>
      )}

      <View style={{ marginTop: spacing.md }}>
        <Button
          label={mutation.isPending ? 'Confirmation…' : 'Confirmer'}
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </View>
    </Sheet>
  );
}
