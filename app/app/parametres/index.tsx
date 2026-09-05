/**
 * Paramètres — compte, préférences, sécurité.
 *
 * Volontairement pauvre, et c'est un choix : le contrat exclut l'i18n de
 * l'interface et les notifications push. N'y figurent que des réglages qui
 * changent réellement quelque chose, chacun adossé à un endpoint réel. Un écran
 * de paramètres rempli d'interrupteurs qui ne font rien est pire que pas
 * d'écran du tout.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useRetour } from '../../lib/hooks/useRetour';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Card, Field, Button, Divider, AppBar, EmptyState } from '../../components/ui';
import { API_BASE_URL } from '../../lib/config';
import { changePassword, getPreferences, me, updatePreferences } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

const REGISTRES = [
  { valeur: 'famille', label: 'Famille' },
  { valeur: 'cooperative', label: 'Coopérative' },
  { valeur: 'association', label: 'Association' },
];

export default function ParametresScreen() {
  const router = useRouter();
  const retour = useRetour();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authEnCours } = useAuthToken();

  const { data: utilisateur } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    enabled: isAuthenticated,
  });

  const preferences = useQuery({
    queryKey: ['preferences'],
    queryFn: getPreferences,
    enabled: isAuthenticated,
  });

  const majPreferences = useMutation({
    mutationFn: updatePreferences,
    onSuccess: (valeur) => queryClient.setQueryData(['preferences'], valeur),
    onSettled: () => {
      // Le badge de l'accueil dépend de cette préférence.
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [messageMotDePasse, setMessageMotDePasse] = useState<string | null>(null);

  const changement = useMutation({
    mutationFn: () => changePassword({ current_password: ancien, new_password: nouveau }),
    onSuccess: () => {
      setAncien('');
      setNouveau('');
      setMessageMotDePasse('Mot de passe modifié.');
    },
    onError: (raison) =>
      setMessageMotDePasse(raison instanceof Error ? raison.message : 'Le changement a échoué.'),
  });

  // Le message de confirmation ne doit pas rester indéfiniment à l'écran.
  useEffect(() => {
    if (!messageMotDePasse) return;
    const minuteur = setTimeout(() => setMessageMotDePasse(null), 5000);
    return () => clearTimeout(minuteur);
  }, [messageMotDePasse]);

  if (authEnCours) return <View style={styles.screen} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Paramètres" onBack={retour} />
        <EmptyState
          title="Connectez-vous"
          subtitle="Les paramètres concernent votre compte."
          actionLabel="Se connecter"
          onAction={() => router.push('/(auth)/connexion')}
        />
      </View>
    );
  }

  const prefs = preferences.data;

  return (
    <View style={styles.screen}>
      <AppBar title="Paramètres" onBack={retour} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="label" tone="muted">Compte</Text>
        <Card variant="elevated" style={styles.carte}>
          {utilisateur ? (
            // View et non Fragment : `Card` de react-native-paper clone ses
            // enfants directs avec un `index`, qu'un Fragment rejette.
            <View style={styles.bloc}>
              <View style={styles.ligne}>
                <Text variant="body" tone="muted">Nom</Text>
                <Text variant="body">
                  {utilisateur.first_name} {utilisateur.last_name}
                </Text>
              </View>
              <Divider />
              <View style={styles.ligne}>
                <Text variant="body" tone="muted">Téléphone</Text>
                <Text variant="body">{utilisateur.phone}</Text>
              </View>
            </View>
          ) : (
            <Text variant="body" tone="muted">Chargement…</Text>
          )}
        </Card>

        <Text variant="label" tone="muted">Préférences</Text>
        <Card variant="elevated" style={styles.carte}>
          <View style={styles.ligne}>
            <View style={styles.libelle}>
              <Text variant="body">Notifications dans l’application</Text>
              <Text variant="caption" tone="muted">
                Coupe le badge. L’historique reste consultable.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Notifications dans l’application"
              disabled={!prefs || majPreferences.isPending}
              value={prefs?.notifications_enabled ?? true}
              onValueChange={(actif) => majPreferences.mutate({ notifications_enabled: actif })}
              trackColor={{ true: colors.unlock.green, false: colors.line }}
            />
          </View>

          <Divider />

          <View style={styles.libelle}>
            <Text variant="body">Ton par défaut des invitations</Text>
            <Text variant="caption" tone="muted">
              Registre proposé en premier sur l’écran de partage.
            </Text>
          </View>
          <View style={styles.registres}>
            {REGISTRES.map((registre) => {
              const actif = prefs?.default_share_register === registre.valeur;
              return (
                <Pressable
                  key={registre.valeur}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                  accessibilityLabel={registre.label}
                  disabled={majPreferences.isPending}
                  onPress={() => majPreferences.mutate({ default_share_register: registre.valeur })}
                  style={[styles.puce, actif && styles.puceActive]}
                >
                  {actif && <Ionicons name="checkmark" size={14} color={colors.brand.ink} />}
                  <Text variant="caption" tone={actif ? 'ink' : 'muted'}>{registre.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Text variant="label" tone="muted">Sécurité</Text>
        <Card variant="elevated" style={styles.carte}>
          <Field label="Mot de passe actuel" secureTextEntry value={ancien} onChangeText={setAncien} />
          <Field
            label="Nouveau mot de passe"
            secureTextEntry
            value={nouveau}
            onChangeText={setNouveau}
            error={nouveau.length > 0 && nouveau.length < 6 ? 'Six caractères au minimum.' : undefined}
          />
          <Button
            label={changement.isPending ? 'Modification…' : 'Changer le mot de passe'}
            variant="secondary"
            loading={changement.isPending}
            disabled={ancien.length < 1 || nouveau.length < 6}
            onPress={() => {
              setMessageMotDePasse(null);
              changement.mutate();
            }}
          />
          {messageMotDePasse && (
            <Text variant="label" tone={changement.isError ? 'alert' : 'success'}>
              {messageMotDePasse}
            </Text>
          )}
        </Card>

        <Text variant="label" tone="muted">À propos</Text>
        <Card variant="elevated" style={styles.carte}>
          <View style={styles.ligne}>
            <Text variant="body" tone="muted">Version</Text>
            <Text variant="body">{Constants.expoConfig?.version ?? '—'}</Text>
          </View>
          <Divider />
          <View style={styles.ligne}>
            <Text variant="body" tone="muted">Serveur</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{API_BASE_URL}</Text>
          </View>
        </Card>

        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={async () => {
            await setToken(null);
            router.replace('/');
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl },
  carte: { backgroundColor: colors.surface.white, gap: spacing.sm, marginBottom: spacing.lg },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  bloc: { gap: spacing.sm },
  libelle: { flex: 1, gap: 2 },
  registres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  puceActive: { borderColor: colors.brand.ink, backgroundColor: colors.brand.yellow },
});
