/**
 * Connexion — téléphone + mot de passe (cf. <perimetre> P0). Écran non détaillé par
 * AGENT_UI en Phase 1A : version fonctionnelle minimale.
 */
import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, Link, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, alpha } from '@shared/theme/tokens';
import { Text, Field, Button } from '../../components/ui';
import { login } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';

export default function ConnexionScreen() {
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => login({ phone, password }),
    onSuccess: async ({ token }) => {
      await setToken(token);
      router.replace((redirectTo as Href) ?? '/');
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="flash" size={28} color={colors.brand.ink} />
            </View>
            <Text variant="title">Connexion</Text>
            <Text variant="body" tone="muted">
              Veuillez entrer vos identifiants pour continuer
            </Text>
          </View>

          <View style={styles.form}>
            <Field label="Numéro de téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Field label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text variant="label" tone="alert">
                  Identifiants incorrects. Veuillez réessayer.
                </Text>
              </View>
            )}

            <Button
              label={mutation.isPending ? 'Connexion en cours…' : 'Se connecter'}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            />
          </View>

          <View style={styles.footer}>
            <Link href="/(auth)/inscription">
              <View style={styles.footerRow}>
                <Text variant="label" tone="muted">
                  Pas encore de compte ?
                </Text>
                <Text variant="label">S'inscrire</Text>
              </View>
            </Link>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.surface.page,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  header: { marginBottom: spacing.xxl, alignItems: 'flex-start', gap: spacing.xs },
  logo: {
    width: 56,
    height: 56,
    backgroundColor: colors.brand.yellow,
    borderRadius: radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  form: { gap: spacing.lg },
  errorBox: {
    backgroundColor: alpha(colors.alert.red, 0.08),
    borderWidth: 1,
    borderColor: alpha(colors.alert.red, 0.3),
    borderRadius: radii.card,
    padding: spacing.md,
  },
  footer: { marginTop: 'auto', paddingTop: spacing.xl, alignItems: 'center' },
  footerRow: { flexDirection: 'row', gap: spacing.xs },
});
