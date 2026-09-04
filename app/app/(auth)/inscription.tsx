/**
 * Inscription — cf. <perimetre> P0. Écran non détaillé par AGENT_UI en Phase 1A :
 * version fonctionnelle minimale. C'est le point d'entrée d'un visiteur venant d'un
 * lien de groupe partagé (cf. GroupScreen → « Rejoindre le groupe » si non connecté).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Link, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Field, Button } from '../../components/ui';
import { register } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';

export default function InscriptionScreen() {
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      register({ first_name: firstName, last_name: lastName, phone, password }),
    onSuccess: async ({ token }) => {
      await setToken(token);
      router.replace((redirectTo as Href) ?? '/');
    },
  });

  return (
    <View style={styles.screen}>
      <Text variant="title">Créer un compte</Text>

      <Field label="Prénom" value={firstName} onChangeText={setFirstName} />
      <Field label="Nom" value={lastName} onChangeText={setLastName} />
      <Field label="Téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />

      {mutation.isError && (
        <Text variant="label" tone="alert">
          L'inscription a échoué. Vérifiez vos informations.
        </Text>
      )}

      <Button
        label={mutation.isPending ? 'Création…' : 'Créer mon compte'}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />

      <Link href="/(auth)/connexion" style={styles.link}>
        <Text variant="label" tone="muted">
          Déjà un compte ? Se connecter
        </Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white, padding: spacing.xl, gap: spacing.lg, justifyContent: 'center' },
  link: { alignSelf: 'center' },
});
