/**
 * Mot de passe oublié — deux étapes dans un seul écran.
 *
 * Le flux est réel côté serveur : code à six chiffres, haché en base, valable
 * quinze minutes, invalidé après emploi, et une nouvelle demande annule la
 * précédente. Ce qui manque, c'est la **remise** du code : aucune passerelle SMS
 * n'est au périmètre du contrat.
 *
 * Plutôt que de simuler un envoi — un écran qui annonce « code envoyé » sans
 * rien envoyer est un mensonge —, le code s'affiche dans un encart explicitement
 * marqué « démonstration » quand le jeton est configuré. Sans jeton, l'écran dit
 * franchement que la remise n'est pas branchée.
 */
import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, alpha } from '@shared/theme/tokens';
import { Text, Field, Button, Card, AppBar } from '../../components/ui';
import { demoCodeDisponible, forgotPassword, resetPassword } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';

type Etape = 'demande' | 'saisie' | 'termine';

export default function MotDePasseOublieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [etape, setEtape] = useState<Etape>('demande');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [codeDemo, setCodeDemo] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const demande = useMutation({
    mutationFn: () => forgotPassword({ phone: phone.trim() }),
    onSuccess: (reponse) => {
      setCodeDemo(reponse.demo_code);
      setEtape('saisie');
    },
    onError: (raison) =>
      setErreur(raison instanceof Error ? raison.message : 'La demande a échoué.'),
  });

  const reinitialisation = useMutation({
    mutationFn: () =>
      resetPassword({ phone: phone.trim(), code: code.trim(), new_password: nouveau }),
    onSuccess: async ({ token }) => {
      // Le serveur connecte dans la foulée : redemander le mot de passe qu'on
      // vient de choisir serait une friction gratuite.
      await setToken(token);
      setEtape('termine');
      router.replace('/');
    },
    onError: (raison) =>
      setErreur(raison instanceof Error ? raison.message : 'Code invalide ou expiré.'),
  });

  const motDePasseTropCourt = nouveau.length > 0 && nouveau.length < 6;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={styles.screen}>
        <AppBar title="Mot de passe oublié" onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
        >
          {etape === 'demande' && (
            <>
              <Text variant="body" tone="muted">
                Indiquez le numéro de téléphone de votre compte. Nous vous enverrons un
                code à six chiffres pour choisir un nouveau mot de passe.
              </Text>

              <Field
                label="Numéro de téléphone"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
              />

              <Button
                label={demande.isPending ? 'Envoi…' : 'Recevoir un code'}
                loading={demande.isPending}
                disabled={phone.trim().length < 6}
                onPress={() => {
                  setErreur(null);
                  demande.mutate();
                }}
              />
            </>
          )}

          {etape === 'saisie' && (
            <>
              {/* La réponse du serveur est identique que le numéro existe ou
                  non : le dire ici évite de laisser croire à une confirmation
                  que le compte a bien été trouvé. */}
              <Text variant="body" tone="muted">
                Si un compte existe pour {phone.trim()}, un code lui a été attribué.
                Il est valable quinze minutes.
              </Text>

              {codeDemo && (
                <Card variant="elevated" style={styles.demo}>
                  <View style={styles.demoEntete}>
                    <Ionicons name="construct" size={16} color={colors.brand.ink} />
                    <Text variant="label">Mode démonstration</Text>
                  </View>
                  <Text variant="title" tabularNums>
                    {codeDemo}
                  </Text>
                  <Text variant="caption" tone="muted">
                    En production, ce code arriverait par SMS. Aucune passerelle
                    d’envoi n’est au périmètre de ce prototype.
                  </Text>
                </Card>
              )}

              {!codeDemo && !demoCodeDisponible && (
                <Card variant="elevated" style={styles.avertissement}>
                  <Text variant="label">Remise du code non branchée</Text>
                  <Text variant="caption" tone="muted">
                    Le code a bien été créé côté serveur, mais aucun envoi SMS n’est
                    configuré. Renseignez EXPO_PUBLIC_DEMO_TOKEN pour l’afficher ici.
                  </Text>
                </Card>
              )}

              <Field
                label="Code à six chiffres"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
              />
              <Field
                label="Nouveau mot de passe"
                secureTextEntry
                value={nouveau}
                onChangeText={setNouveau}
                error={motDePasseTropCourt ? 'Six caractères au minimum.' : undefined}
              />

              <Button
                label={reinitialisation.isPending ? 'Validation…' : 'Changer mon mot de passe'}
                loading={reinitialisation.isPending}
                disabled={code.trim().length < 4 || nouveau.length < 6}
                onPress={() => {
                  setErreur(null);
                  reinitialisation.mutate();
                }}
              />

              <Button
                label="Renvoyer un code"
                variant="ghost"
                onPress={() => {
                  setErreur(null);
                  setCode('');
                  demande.mutate();
                }}
              />
            </>
          )}

          {erreur && (
            <View style={styles.erreur}>
              <Text variant="label" tone="alert">
                {erreur}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, gap: spacing.lg },
  demo: { backgroundColor: colors.surface.white, gap: spacing.xs, alignItems: 'flex-start' },
  demoEntete: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  avertissement: { backgroundColor: colors.surface.raised, gap: spacing.xs },
  erreur: {
    backgroundColor: alpha(colors.alert.red, 0.08),
    borderWidth: 1,
    borderColor: alpha(colors.alert.red, 0.3),
    borderRadius: radii.card,
    padding: spacing.md,
  },
});
