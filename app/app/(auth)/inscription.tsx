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
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Field, Button } from '../../components/ui';
import { register } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';
import { Ionicons } from '@expo/vector-icons';

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
              <Ionicons name="person-add" size={28} color={colors.brand.ink} />
            </View>
            <Text variant="title" style={styles.title}>Créer un compte</Text>
            <Text variant="body" tone="muted">
              Rejoignez la communauté KashFlow au Togo 🌾
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <Field
              label="Prénom"
              placeholder="Alex"
              value={firstName}
              onChangeText={setFirstName}
            />
            <Field
              label="Nom"
              placeholder="Kofi"
              value={lastName}
              onChangeText={setLastName}
            />
            <Field
              label="Numéro de téléphone"
              placeholder="06 00 00 00 00"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Field
              label="Mot de passe"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text variant="label" tone="alert">
                  L'inscription a échoué. Vérifiez vos informations.
                </Text>
              </View>
            )}

            <Button
              label={mutation.isPending ? 'Création en cours...' : 'Créer mon compte'}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            />
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Link href="/(auth)/connexion">
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Text variant="label" tone="muted">Déjà un compte ?</Text>
                <Text variant="label" style={{ color: colors.brand.ink, fontWeight: 'bold' }}>
                  Se connecter
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
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    padding: spacing.md,
    borderRadius: radii.block,
    borderWidth: 1,
    borderColor: '#FFC1C1',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
});

