/**
 * Confirmation — récapitulatif de la commande, réassurance sur le paiement, et
 * surtout « Inviter » : le mécanisme de croissance du produit (P0 du <perimetre>).
 *
 * Deux chemins mènent ici. Après un join, la redirection porte déjà tout le
 * détail en paramètres : aucun appel réseau n'est nécessaire. Mais l'écran groupe
 * y mène aussi par « Voir ma commande », sans paramètre — l'écran se réduisait
 * alors à un titre nu. Il va désormais chercher la commande par son identifiant.
 */
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { ActionBar, Text, Button, Card, Divider, AppBar, EmptyState } from '../../components/ui';
import { getOrder } from '../../lib/api/endpoints';
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

  const orderId = Number(params.orderId);
  const viaParams = !!params.groupId && Number(params.quantity ?? 0) > 0;

  // Repli : on ne récupère la commande que si la redirection ne l'a pas fournie.
  const { data: fetched, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: !viaParams && Number.isFinite(orderId),
  });

  const commande = viaParams
    ? {
        groupId: Number(params.groupId),
        shareCode: params.shareCode,
        productName: params.productName ?? '',
        unitLabel: params.unitLabel ?? 'unité',
        quantity: Number(params.quantity ?? 0),
        unitPrice: Number(params.unitPrice ?? 0),
        totalAmount: Number(params.totalAmount ?? 0),
      }
    : fetched
      ? {
          groupId: fetched.group_id,
          shareCode: undefined,
          productName: fetched.product_name,
          unitLabel: fetched.unit_label,
          quantity: fetched.quantity,
          unitPrice: fetched.unit_price,
          totalAmount: fetched.total_amount,
        }
      : null;

  if (!commande) {
    return (
      <View style={styles.screen}>
        <AppBar title="Ma commande" onBack={() => router.back()} />
        {isLoading ? (
          <View />
        ) : (
          <EmptyState
            title="Commande introuvable"
            subtitle={isError ? 'La connexion au serveur a échoué.' : undefined}
            actionLabel="Réessayer"
            onAction={() => refetch()}
          />
        )}
      </View>
    );
  }

  const unitePluriel = pluralizeUnit(commande.unitLabel, commande.quantity);
  // Le lien de partage quand on l'a — il ouvre la même vue sans exiger de
  // compte — sinon l'identifiant. Typé explicitement : expo-router n'infère pas
  // une route depuis une expression ternaire.
  const versGroupe = (
    commande.shareCode ? `/g/${commande.shareCode}` : `/groupe/${commande.groupId}`
  ) as Href;

  return (
    <View style={styles.screen}>
      <AppBar title="Commande confirmée" onBack={() => router.back()} />

      <View style={styles.content}>
        <Text variant="heading" tone="success">
          Vous participez au groupe pour {commande.productName}
        </Text>

        <Card variant="elevated" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">
              Quantité
            </Text>
            <Text variant="body" tabularNums>
              {commande.quantity} {unitePluriel}
            </Text>
          </View>
          <Divider />
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">
              Prix unitaire actuel
            </Text>
            <Text variant="body" tabularNums>
              {formatFcfa(commande.unitPrice)}
            </Text>
          </View>
          <Divider />
          <View style={styles.summaryRow}>
            <Text variant="label">Total à régler</Text>
            <Text variant="heading" tabularNums>
              {formatFcfa(commande.totalAmount)}
            </Text>
          </View>
        </Card>

        <Text variant="body" tone="muted">
          Le débit intervient à la clôture du groupe, pas maintenant. Si le prix baisse
          encore d'ici là, vous payez le nouveau prix — comme tous les participants.
        </Text>
      </View>

      <ActionBar>
        <Button
          label="Voir le groupe"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.push(versGroupe)}
        />
        <View style={styles.actionBarPrimary}>
          <Button
            label="Inviter des proches"
            onPress={() => router.push(`/partager/${commande.groupId}`)}
          />
        </View>
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  summaryCard: { gap: spacing.sm, backgroundColor: colors.surface.white },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBarPrimary: { flex: 1 },
});
