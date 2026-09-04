/**
 * KashFlow — ProductCard
 * Carte de catalogue : nom, marchand, prix individuel. Rien d'autre : la progression
 * d'un groupe (participants, quantité, palier) n'existe pas sur ProductCard côté
 * contrat — elle vit sur GroupDetail/ProductDetail.open_groups, affichée sur la
 * fiche produit et l'écran groupe. Ne PAS lui faire porter une donnée qu'elle n'a pas.
 *
 * Densité visuelle volontairement plus forte qu'une simple ligne (bloc icône, prix en
 * PriceDisplay) — sans sortir des tokens : pas d'ombre, radius 12, palette figée.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@shared/theme/tokens';
import { Text } from './Text';
import { Card } from './Card';
import { PriceDisplay } from './PriceDisplay';

export interface ProductCardProps {
  name: string;
  merchantName: string;
  individualPrice: number;
  onPress: () => void;
}

export function ProductCard({ name, merchantName, individualPrice, onPress }: ProductCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconBlock}>
            <Ionicons name="pricetag-outline" size={26} color={colors.brand.ink} />
          </View>
          <View style={styles.info}>
            <Text variant="body" numberOfLines={2}>
              {name}
            </Text>
            <Text variant="caption" tone="muted">
              {merchantName}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text variant="caption" tone="muted">
            Prix au détail
          </Text>
          <PriceDisplay value={individualPrice} size="heading" />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  iconBlock: {
    width: 56,
    height: 56,
    borderRadius: radii.block,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 2 },
  priceRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
});
