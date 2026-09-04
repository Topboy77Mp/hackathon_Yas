/**
 * KashFlow — ProductCard
 * Carte « objet » : bloc icône, prix en avant/après quand un vrai groupe existe. Le
 * avant/après (`best_open_group_price`) ne s'affiche QUE si le produit a réellement un
 * groupe ouvert moins cher — jamais de remise ni de progression inventée pour les
 * produits qui n'en ont pas (cf. types.ts, ce champ est optionnel exprès).
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, alpha } from '@shared/theme/tokens';
import { Text } from './Text';
import { Card } from './Card';
import { PriceDisplay } from './PriceDisplay';
import { Badge } from './Badge';

export interface ProductCardProps {
  name: string;
  merchantName: string;
  individualPrice: number;
  bestOpenGroupPrice?: number;
  openGroupsCount?: number;
  onPress: () => void;
}

export function ProductCard({
  name,
  merchantName,
  individualPrice,
  bestOpenGroupPrice,
  openGroupsCount,
  onPress,
}: ProductCardProps) {
  const hasOpenGroup = bestOpenGroupPrice !== undefined && bestOpenGroupPrice < individualPrice;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.touchable}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconBlock}>
            <Ionicons name="pricetag" size={28} color={colors.brand.ink} />
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
          <View style={styles.priceCol}>
            {!hasOpenGroup && (
              <Text variant="caption" tone="muted">
                Prix au détail
              </Text>
            )}
            <PriceDisplay
              value={hasOpenGroup ? (bestOpenGroupPrice as number) : individualPrice}
              previousValue={hasOpenGroup ? individualPrice : undefined}
              savingsAchieved={hasOpenGroup}
              size="heading"
            />
          </View>
          {hasOpenGroup && openGroupsCount ? (
            <Badge label={`${openGroupsCount} groupe${openGroupsCount > 1 ? 's' : ''} ouvert${openGroupsCount > 1 ? 's' : ''}`} tone="success" />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: { marginTop: spacing.lg },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  iconBlock: {
    width: 60,
    height: 60,
    borderRadius: radii.block,
    backgroundColor: alpha(colors.brand.yellow, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 2 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  priceCol: { gap: 2 },
});
