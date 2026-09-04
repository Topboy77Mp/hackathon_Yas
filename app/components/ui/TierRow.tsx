/**
 * KashFlow — TierRow
 * Une ligne de la grille de paliers. Trois états visuels seulement :
 * — `current` : le palier appliqué maintenant, en vert (quelque chose a été gagné) ;
 * — `next`    : le palier à atteindre, en jaune (tu peux agir ici) ;
 * — défaut    : les paliers déjà dépassés ou hors d'atteinte, neutres.
 * Le palier courant est décidé par le serveur (D3) : ce composant ne calcule rien.
 */
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, alpha } from '@shared/theme/tokens';
import { Text } from './Text';

export type TierRowState = 'default' | 'current' | 'next';

export interface TierRowProps {
  /** Ex. « 100 à 199 sacs » */
  range: string;
  /** Ex. « 19 000 » */
  price: string;
  state?: TierRowState;
}

export function TierRow({ range, price, state = 'default' }: TierRowProps) {
  const tone = state === 'current' ? 'success' : 'ink';

  return (
    <View style={[styles.row, state === 'current' && styles.current, state === 'next' && styles.next]}>
      <Text variant="label" tone={tone}>
        {range}
      </Text>
      <Text variant="label" tone={tone} tabularNums>
        {price}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.block,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  current: {
    backgroundColor: colors.unlock.greenSoft,
    borderColor: colors.unlock.green,
  },
  next: {
    backgroundColor: alpha(colors.brand.yellow, 0.16),
    borderColor: colors.brand.yellowDeep,
  },
});
