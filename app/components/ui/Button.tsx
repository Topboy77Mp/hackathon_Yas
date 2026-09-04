/**
 * KashFlow — Button
 * primary : action principale (jaune, une seule par écran en général).
 * secondary : action alternative, contour, sans remplissage jaune.
 * ghost : action discrète (liens d'action, ex. « Voir ma commande »).
 */
import { Pressable, ActivityIndicator, type PressableProps, StyleSheet } from 'react-native';
import { colors, radii, spacing, hitSlop } from '@shared/theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, fullWidth = true, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && stylesPressed[variant],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.brand.ink : colors.text.muted} />
      ) : (
        <Text variant="body" tone={variant === 'primary' ? 'ink' : variant === 'ghost' ? 'muted' : 'ink'} style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitSlop.minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontWeight: '500' },
  primary: { backgroundColor: colors.brand.yellow },
  secondary: { backgroundColor: colors.surface.white, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
});

const stylesPressed = StyleSheet.create({
  primary: { backgroundColor: colors.brand.yellowDeep },
  secondary: { backgroundColor: colors.surface.raised },
  ghost: { backgroundColor: colors.surface.raised },
});
