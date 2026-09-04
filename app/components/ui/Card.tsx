import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@shared/theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'raised' | 'outlined';
}

export function Card({ variant = 'raised', style, ...rest }: CardProps) {
  return <View {...rest} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.block, padding: spacing.lg },
  raised: { backgroundColor: colors.surface.raised },
  outlined: { backgroundColor: colors.surface.white, borderWidth: 1, borderColor: colors.line },
});
