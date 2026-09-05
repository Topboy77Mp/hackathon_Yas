/**
 * KashFlow — ProductCard
 * Disposition horizontale : bloc image à gauche, infos + prix à droite, CTA flèche.
 * Aucune donnée inventée : la progression et le badge de remise ne s'affichent que quand
 * le produit a réellement un groupe ouvert moins cher (best_open_group_price défini) —
 * pas de "45/60" ou "-25%" d'exemple pour les produits qui n'ont aucun groupe.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, alpha } from '@shared/theme/tokens';
import { Text } from './Text';
import { Card } from './Card';
import { PriceDisplay } from './PriceDisplay';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';
import { pluralizeUnit } from '../../lib/format';

export interface ProductCardProps {
  name: string;
  merchantName: string;
  individualPrice: number;
  unitLabel?: string;
  bestOpenGroupPrice?: number;
  openGroupsCount?: number;
  bestOpenGroupCurrentQuantity?: number;
  bestOpenGroupTargetQuantity?: number;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function ProductCard({
  name,
  merchantName,
  individualPrice,
  unitLabel = 'unité',
  bestOpenGroupPrice,
  openGroupsCount,
  bestOpenGroupCurrentQuantity,
  bestOpenGroupTargetQuantity,
  iconName = 'pricetag-outline',
  onPress,
}: ProductCardProps) {
  const hasOpenGroup = bestOpenGroupPrice !== undefined && bestOpenGroupPrice < individualPrice;
  const discountPercent = hasOpenGroup
    ? Math.round(((individualPrice - (bestOpenGroupPrice as number)) / individualPrice) * 100)
    : null;
  const hasProgress =
    hasOpenGroup && bestOpenGroupCurrentQuantity !== undefined && bestOpenGroupTargetQuantity !== undefined;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.imageBlock}>
            <Ionicons name={iconName} size={36} color={colors.unlock.green} />
          </View>

          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text variant="label" tone="success">
                {merchantName}
              </Text>
              {discountPercent !== null && <Badge label={`-${discountPercent}%`} tone="success" />}
            </View>

            <Text variant="heading" numberOfLines={2}>
              {name}
            </Text>

            {hasProgress && (
              <View style={styles.progressBlock}>
                <View style={styles.progressLabels}>
                  <Text variant="caption" tone="muted">
                    Progression du groupe
                  </Text>
                  <Text variant="caption" tabularNums>
                    {bestOpenGroupCurrentQuantity} / {bestOpenGroupTargetQuantity} {pluralizeUnit(unitLabel, bestOpenGroupTargetQuantity!)}
                  </Text>
                </View>
                <ProgressBar value={bestOpenGroupCurrentQuantity! / bestOpenGroupTargetQuantity!} height={12} />
              </View>
            )}

            <View style={styles.footerRow}>
              <PriceDisplay
                value={hasOpenGroup ? (bestOpenGroupPrice as number) : individualPrice}
                savingsAchieved={hasOpenGroup}
                size="heading"
              />
              <View style={styles.ctaCircle}>
                <Ionicons name="arrow-forward" size={16} color={colors.brand.ink} />
              </View>
            </View>

            {!hasOpenGroup && openGroupsCount === undefined && (
              <Text variant="caption" tone="muted">
                Prix au détail
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: { marginTop: spacing.lg },
  pressed: { opacity: 0.9 },
  card: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  imageBlock: {
    width: 96,
    aspectRatio: 1,
    backgroundColor: alpha(colors.unlock.green, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  info: { flex: 1, padding: spacing.md, justifyContent: 'space-between', gap: spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressBlock: { gap: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
