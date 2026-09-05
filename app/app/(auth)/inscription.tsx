/**
 * Inscription — cf. <perimetre> P0. Écran non détaillé par AGENT_UI en Phase 1A :
 * version fonctionnelle minimale. C'est le point d'entrée d'un visiteur venant d'un
 * lien de groupe partagé (cf. GroupScreen → « Rejoindre » si non connecté).
 */
import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Link, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, alpha } from '@shared/theme/tokens';
import { Text, Field, Button } from '../../components/ui';
import { Pressable } from 'react-native';
import { register } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';

export default function InscriptionScreen() {
  const router = useRouter();
  const { redirectTo, groupName } = useLocalSearchParams<{ redirectTo?: string; groupName?: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Le contrat prévoit deux profils : acheteur et commerçant. Un seul écran
  // pour les deux — le rôle est décidé par le serveur à partir du nom de
  // boutique, jamais envoyé par le client.
  const [estCommercant, setEstCommercant] = useState(false);
  const [boutique, setBoutique] = useState('');
  const [lieu, setLieu] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      register({
        first_name: firstName,
        last_name: lastName,
        phone,
        password,
        ...(estCommercant
          ? { business_name: boutique.trim(), business_location: lieu.trim() || null }
          : {}),
      }),
    onSuccess: async ({ token }) => {
      await setToken(token);
      router.replace((redirectTo as Href) ?? '/');
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="person-add" size={26} color={colors.brand.ink} />
            </View>
            <Text variant="title">Créer un compte</Text>
            <Text variant="body" tone="muted">
              {groupName ? `Pour rejoindre « ${groupName} », créez d'abord votre compte.` : 'Rejoignez la communauté KashFlow'}
            </Text>
          </View>

          <View style={styles.form}>
            <Field label="Prénom" value={firstName} onChangeText={setFirstName} />
            <Field label="Nom" value={lastName} onChangeText={setLastName} />
            <Field label="Numéro de téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Field label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />

            <View style={styles.roles}>
              {[
                { valeur: false, label: 'Je suis acheteur' },
                { valeur: true, label: 'Je suis commerçant' },
              ].map((role) => {
                const actif = estCommercant === role.valeur;
                return (
                  <Pressable
                    key={role.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                    accessibilityLabel={role.label}
                    onPress={() => setEstCommercant(role.valeur)}
                    style={[styles.role, actif && styles.roleActif]}
                  >
                    <Ionicons
                      name={role.valeur ? 'storefront' : 'cart'}
                      size={16}
                      color={actif ? colors.brand.ink : colors.text.muted}
                    />
                    <Text variant="label" tone={actif ? 'ink' : 'muted'}>
                      {role.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {estCommercant && (
              <>
                <Field
                  label="Nom de votre commerce"
                  placeholder="Agro-Intrants Zio"
                  value={boutique}
                  onChangeText={setBoutique}
                />
                <Field
                  label="Ville (facultatif)"
                  placeholder="Tsévié"
                  value={lieu}
                  onChangeText={setLieu}
                />
                <Text variant="caption" tone="muted">
                  Vous pourrez publier vos produits et suivre vos groupes depuis
                  l’espace commerçant.
                </Text>
              </>
            )}

            {mutation.isError && (
              <View style={styles.errorBox}>
                <Text variant="label" tone="alert">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "L'inscription a échoué. Vérifiez vos informations."}
                </Text>
              </View>
            )}

            <Button
              label={mutation.isPending ? 'Création en cours…' : 'Créer mon compte'}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            />
          </View>

          <View style={styles.footer}>
            <Link href="/(auth)/connexion">
              <View style={styles.footerRow}>
                <Text variant="label" tone="muted">
                  Déjà un compte ?
                </Text>
                <Text variant="label">Se connecter</Text>
              </View>
            </Link>
          </View>
        </ScrollView>
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
    // Assez de marge pour que le dernier champ passe au-dessus du clavier
    // une fois la fenêtre redimensionnée par Android.
    paddingBottom: spacing.xxxl,
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
  form: { gap: spacing.md },
  roles: { flexDirection: 'row', gap: spacing.sm },
  role: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  roleActif: { borderColor: colors.brand.ink, backgroundColor: colors.brand.yellow },
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
