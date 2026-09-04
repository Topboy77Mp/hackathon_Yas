/**
 * Profil — point d'entrée vers Mes groupes / Mes commandes, et vers la connexion
 * si l'utilisateur ne l'est pas encore. C'était un cul-de-sac de navigation sans
 * aucun contenu : c'est aussi, avec l'icône compte de l'Accueil, le seul chemin
 * pour atteindre Mes groupes/Mes commandes/Connexion depuis l'app.
 */
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@shared/theme/tokens';
import { Text, Button, Divider, AppBar, EmptyState } from '../../components/ui';
import { me } from '../../lib/api/endpoints';
import { setToken } from '../../lib/api/auth-storage';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

export default function ProfilScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthToken();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: me, enabled: isAuthenticated });

  if (isAuthLoading) {
    return <View style={styles.screen} />;
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Profil" onBack={() => router.back()} />
        <EmptyState
          title="Connectez-vous"
          subtitle="Créez un compte ou connectez-vous pour retrouver vos groupes et vos commandes."
          actionLabel="Se connecter"
          onAction={() => router.push('/(auth)/connexion')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBar title="Profil" onBack={() => router.back()} />
      <View style={styles.content}>
        {user && (
          <View style={styles.identity}>
            <Text variant="heading">
              {user.first_name} {user.last_name}
            </Text>
            <Text variant="body" tone="muted">
              {user.phone}
            </Text>
          </View>
        )}

        <Divider style={styles.divider} />

        <View style={styles.links}>
          <Button label="Mes groupes" variant="secondary" onPress={() => router.push('/mes-groupes')} />
          <Button label="Mes commandes" variant="secondary" onPress={() => router.push('/mes-commandes')} />
        </View>

        <Divider style={styles.divider} />

        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={async () => {
            await setToken(null);
            router.replace('/');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, gap: spacing.lg },
  identity: { gap: spacing.xs },
  divider: { marginVertical: spacing.xs },
  links: { gap: spacing.md },
});
