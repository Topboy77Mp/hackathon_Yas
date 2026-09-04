/**
 * KashFlow — Button
 * Enveloppe react-native-paper (Button de Paper : gestion du loading, ripple, accessibilité).
 * primary : dégradé jaune → jaune profond — Paper gère le contenu, le dégradé est un fond
 * transparent posé dessous (Paper ne fait pas de dégradé nativement).
 * secondary : contour Paper (mode "outlined"). ghost : texte seul (mode "text").
 */
import type { GestureResponderEvent } from 'react-native';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, hitSlop } from '@shared/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
}

export function Button({ label, variant = 'primary', loading = false, fullWidth = true, disabled, onPress }: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientWrap, fullWidth && styles.fullWidth, isDisabled && styles.disabled]}
      >
        <PaperButton
          mode="contained"
          onPress={onPress}
          loading={loading}
          disabled={isDisabled}
          buttonColor="transparent"
          textColor={colors.brand.ink}
          style={styles.paperFillsGradient}
          contentStyle={styles.content}
          labelStyle={styles.label}
        >
          {label}
        </PaperButton>
      </LinearGradient>
    );
  }

  return (
    <PaperButton
      mode={variant === 'secondary' ? 'outlined' : 'text'}
      onPress={onPress}
      loading={loading}
      disabled={isDisabled}
      textColor={variant === 'ghost' ? colors.text.muted : colors.brand.ink}
      style={[fullWidth && styles.fullWidth]}
      contentStyle={styles.content}
      labelStyle={styles.label}
    >
      {label}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  gradientWrap: { borderRadius: radii.pill, overflow: 'hidden' },
  paperFillsGradient: { borderRadius: radii.pill, backgroundColor: 'transparent' },
  fullWidth: { alignSelf: 'stretch' },
  content: { minHeight: hitSlop.minTouchTarget },
  label: { fontSize: 16 },
  disabled: { opacity: 0.5 },
});
