/**
 * KashFlow — Card
 * Enveloppe react-native-paper (Card). Le radius et l'ombre restent nos tokens exacts,
 * posés par-dessus le Card de Paper plutôt que ses valeurs Material par défaut.
 */
import type { ViewProps } from 'react-native';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { colors, radii, spacing, shadow } from '@shared/theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'raised' | 'outlined' | 'elevated';
}

const paperMode: Record<NonNullable<CardProps['variant']>, 'contained' | 'outlined' | 'elevated'> = {
  raised: 'contained',
  outlined: 'outlined',
  elevated: 'elevated',
};

export function Card({ variant = 'raised', style, children, ...rest }: CardProps) {
  return (
    <PaperCard mode={paperMode[variant]} style={[styles.base, styles[variant], style]} {...rest}>
      {children}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.card, padding: spacing.lg },
  raised: { backgroundColor: colors.surface.raised },
  outlined: { backgroundColor: colors.surface.white, borderColor: colors.line },
  /** Carte « objet » : fond blanc + ombre douce, se détache du fond d'écran teinté. */
  elevated: { backgroundColor: colors.surface.white, ...shadow.card },
});
