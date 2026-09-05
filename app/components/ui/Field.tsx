/**
 * KashFlow — Field
 * Enveloppe react-native-paper (TextInput mode="outlined" + HelperText). Label flottant :
 * l'idiome Paper, plutôt que notre ancien label fixe au-dessus du champ.
 *
 * Un champ `secureTextEntry` reçoit d'office l'oeil d'affichage : sur un clavier
 * Android, saisir un mot de passe sans pouvoir le relire est la première cause
 * d'échec de connexion.
 */
import { useState } from 'react';
import type { TextInputProps as RNTextInputProps } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { TextInput as PaperTextInput, HelperText } from 'react-native-paper';
import { spacing } from '@shared/theme/tokens';

export interface FieldProps
  extends Pick<
    RNTextInputProps,
    | 'value'
    | 'onChangeText'
    | 'secureTextEntry'
    | 'keyboardType'
    | 'placeholder'
    | 'accessibilityLabel'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'autoComplete'
    | 'onSubmitEditing'
    | 'returnKeyType'
  > {
  label: string;
  error?: string;
}

export function Field({ label, error, secureTextEntry, ...rest }: FieldProps) {
  const [masque, setMasque] = useState(true);
  const estMotDePasse = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <PaperTextInput
        mode="outlined"
        label={label}
        error={!!error}
        secureTextEntry={estMotDePasse && masque}
        right={
          estMotDePasse ? (
            <PaperTextInput.Icon
              icon={masque ? 'eye' : 'eye-off'}
              onPress={() => setMasque((v) => !v)}
              accessibilityLabel={masque ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
              forceTextInputFocus={false}
            />
          ) : undefined
        }
        {...rest}
      />
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
