/**
 * Confirmation — l'écran le plus faible de tout le parcours avant ce correctif : il
 * n'affichait que l'id technique de la commande, sans récapitulatif, sans réassurance
 * sur le paiement, et surtout sans « Inviter » — le mécanisme de croissance du produit
 * (cf. <perimetre> P0 « Partager »). Repéré en simulant un parcours utilisateur complet.
 * Les paramètres viennent de la redirection après join (rejoindre/[groupId].tsx) : pas
 * de second appel réseau, le join a déjà tout renvoyé.
 */
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Button, Card, Divider, AppBar } from '../../components/ui';
import { formatFcfa, pluralizeUnit } from '../../lib/format';

export default function ConfirmationScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    groupId?: string;
    shareCode?: string;
    productName?: string;
    unitLabel?: string;
    quantity?: string;
    unitPrice?: string;
    totalAmount?: string;
  }>();
  const router = useRouter();

  const quantity = Number(params.quantity ?? 0);
  const unitPrice = Number(params.unitPrice ?? 0);
  const totalAmount = Number(params.totalAmount ?? 0);
  const hasDetails = !!params.groupId && quantity > 0;
  const unitLabel = params.unitLabel ?? 'unité';
  const unitLabelPlural = pluralizeUnit(unitLabel, quantity);

  return (
    <View style={styles.screen}>
      <AppBar title="Commande confirmée" onBack={() => router.back()} />

      <View style={styles.content}>
        <Text variant="heading" tone="success">
          {hasDetails ? `Vous participez au groupe pour ${params.productName}` : 'Votre commande est enregistrée'}
        </Text>

        {hasDetails && (
          <Card variant="raised" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text variant="body" tone="muted">
                Quantité
              </Text>
              <Text variant="body" tabularNums>
                {quantity} {unitLabelPlural}
              </Text>
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text variant="body" tone="muted">
                Prix unitaire actuel
              </Text>
              <Text variant="body" tabularNums>
                {formatFcfa(unitPrice)}
              </Text>
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text variant="label">Total à régler</Text>
              <Text variant="heading" tabularNums>
                {formatFcfa(totalAmount)}
              </Text>
            </View>
          </Card>
        )}

        <Text variant="body" tone="muted">
          Le débit intervient à la clôture du groupe, pas maintenant. Si le prix baisse
          encore d'ici là, vous payez le nouveau prix — comme tous les participants.
        </Text>
      </View>

      {hasDetails && (
        <View style={styles.actionBar}>
          <Button
            label="Voir le groupe"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/g/${params.shareCode}`)}
          />
          <View style={styles.actionBarPrimary}>
            <Button label="Inviter des proches" onPress={() => router.push(`/partager/${params.groupId}`)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  summaryCard: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionBarPrimary: { flex: 1 },
});
