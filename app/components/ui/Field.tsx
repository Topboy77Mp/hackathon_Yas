import { TextInput, View, type TextInputProps, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@shared/theme/tokens';
import { fontFamilies } from '@shared/theme/typography';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, style, ...rest }: FieldProps) {
  return (
    <View style={styles.container}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.text.muted}
        style={[styles.input, !!error && styles.inputError, style]}
      />
      {error && (
        <Text variant="caption" tone="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.block,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.brand.ink,
  },
  inputError: { borderColor: colors.alert.red },
});
