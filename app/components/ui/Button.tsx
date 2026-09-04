/**
 * KashFlow — Button
 * primary : action principale (dégradé jaune → jaune profond, une seule par écran en général).
 * secondary : action alternative, contour, sans remplissage jaune.
 * ghost : action discrète (liens d'action, ex. « Voir ma commande »).
 */
import { Pressable, ActivityIndicator, type PressableProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, hitSlop } from '@shared/theme/tokens';
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

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? colors.brand.ink : colors.text.muted} />
  ) : (
    <Text variant={variant === 'ghost' ? 'label' : 'body'} tone={variant === 'ghost' ? 'muted' : 'ink'}>
      {label}
    </Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        {...rest}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [fullWidth && styles.fullWidth, isDisabled && styles.disabled, pressed && styles.pressedScale]}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

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
      {content}
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
  secondary: { backgroundColor: colors.surface.white, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressedScale: { opacity: 0.9 },
});

const stylesPressed = StyleSheet.create({
  primary: {},
  secondary: { backgroundColor: colors.surface.raised },
  ghost: { backgroundColor: colors.surface.raised },
});
