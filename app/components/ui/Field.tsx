/**
 * KashFlow — Field
 * Enveloppe react-native-paper (TextInput mode="outlined" + HelperText). Label flottant :
 * l'idiome Paper, plutôt que notre ancien label fixe au-dessus du champ.
 */
import type { TextInputProps as RNTextInputProps } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { TextInput as PaperTextInput, HelperText } from 'react-native-paper';
import { spacing } from '@shared/theme/tokens';

export interface FieldProps extends Pick<RNTextInputProps, 'value' | 'onChangeText' | 'secureTextEntry' | 'keyboardType' | 'placeholder' | 'accessibilityLabel'> {
  label: string;
  error?: string;
}

export function Field({ label, error, ...rest }: FieldProps) {
  return (
    <View style={styles.container}>
      <PaperTextInput mode="outlined" label={label} error={!!error} {...rest} />
      {error && (
        <HelperText type="error" visible padding="none">
          {error}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
});
