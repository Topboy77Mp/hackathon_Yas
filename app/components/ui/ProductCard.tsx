/**
 * KashFlow — ProductCard
 * Carte de catalogue : nom, marchand, prix individuel. Rien d'autre : la progression
 * d'un groupe (participants, quantité, palier) n'existe pas sur ProductCard côté
 * contrat — elle vit sur GroupDetail/ProductDetail.open_groups, affichée sur la
 * fiche produit et l'écran groupe. Ne PAS lui faire porter une donnée qu'elle n'a pas.
 */
import { Pressable, StyleSheet } from 'react-native';
import { spacing } from '@shared/theme/tokens';
import { Text } from './Text';
import { Card } from './Card';

export interface ProductCardProps {
  name: string;
  merchantName: string;
  individualPrice: number;
  onPress: () => void;
}

function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

export function ProductCard({ name, merchantName, individualPrice, onPress }: ProductCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <Text variant="body">{name}</Text>
        <Text variant="caption" tone="muted">
          {merchantName}
        </Text>
        <Text variant="label" tabularNums style={styles.price}>
          À partir de {formatFcfa(individualPrice)}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.xs },
  price: { marginTop: spacing.xs },
});
