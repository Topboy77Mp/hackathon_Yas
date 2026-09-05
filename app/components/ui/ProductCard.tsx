/**
 * KashFlow — ProductCard
 * Inspiré d'une carte de marketplace B2B (image en tête, prix marquant, badge de
 * confiance, un seul CTA) mais décongestionné pour mobile : une seule action (toute la
 * carte est cliquable, pas de rangée de boutons), un seul badge, pas de note ni de
 * certification qu'on n'a pas.
 *
 * Aucune donnée inventée : ProductCard (le type du catalogue) ne porte ni quantité, ni
 * participants — cette progression vit sur GroupDetail, affichée sur la fiche produit et
 * l'écran groupe. `best_open_group_price` ne s'affiche que si un vrai groupe existe.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, shadow, alpha } from '@shared/theme/tokens';
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
  /** Choix décoratif par produit connu du catalogue démo — jamais dérivé d'une catégorie
   *  qui n'existe pas dans le contrat. */
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function ProductCard({
  name,
  merchantName,
  individualPrice,
  bestOpenGroupPrice,
  openGroupsCount,
  iconName = 'pricetag-outline',
  onPress,
}: ProductCardProps) {
  const hasOpenGroup = bestOpenGroupPrice !== undefined && bestOpenGroupPrice < individualPrice;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.touchable}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.imageBanner}>
          <Ionicons name={iconName} size={40} color={colors.unlock.green} />
        </View>

        <View style={styles.body}>
          <Text variant="body" numberOfLines={2}>
            {name}
          </Text>
          <Text variant="caption" tone="muted">
            {merchantName}
          </Text>

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
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: { marginTop: spacing.lg },
  card: { padding: 0, overflow: 'hidden' },
  imageBanner: {
    height: 96,
    backgroundColor: alpha(colors.unlock.green, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.lg, gap: 2 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  priceCol: { gap: 2 },
});
