import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter, useLocalSearchParams, Link, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Field, Button } from '../../components/ui';
import { login } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';
import { Ionicons } from '@expo/vector-icons';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              <Ionicons name="flash" size={32} color={colors.brand.ink} />
            </View>
            <Text variant="title" style={styles.title}>Connexion</Text>
            <Text variant="body" tone="muted">
              Veuillez entrer vos identifiants pour continuer
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <Field
              label="Numéro de téléphone"
              placeholder="06 00 00 00 00"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <View style={styles.passwordContainer}>
              <Field
                label="Mot de passe"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Link href="/(auth)/inscription" style={styles.forgotPassword}>
                <Text variant="caption" tone="muted">
                  Mot de passe oublié ?
                </Text>
              </Link>
            </View>

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text variant="label" tone="alert">
                  Identifiants incorrects. Veuillez réessayer.
                </Text>
              </View>
            )}

            <Button
              label={mutation.isPending ? 'Connexion en cours...' : 'Se connecter'}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            />
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Link href="/(auth)/inscription">
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Text variant="label" tone="muted">Pas encore de compte ?</Text>
                <Text variant="label" style={{ color: colors.brand.ink, fontWeight: 'bold' }}>
                  S'inscrire
                </Text>
              </View>
            </Link>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.surface.white,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: 'flex-start',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: colors.brand.yellow,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  passwordContainer: {
    position: 'relative',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC1C1',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
});