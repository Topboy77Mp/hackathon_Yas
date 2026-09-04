/**
 * Créer un groupe — P0 du <perimetre> (« Groupe : création, consultation,
 * rejoindre, quitter »). L'écran manquait entièrement : `POST /groups` n'était
 * appelé nulle part, on ne pouvait que rejoindre un groupe déjà seedé.
 *
 * IA-3 s'insère ici et nulle part ailleurs : avant de créer, on demande au
 * serveur s'il existe déjà un groupe équivalent. C'est l'interception qui
 * compte, pas la finesse du rapprochement — trois groupes de 60 sacs ne
 * débloquent aucun palier, un groupe de 180 en débloque deux.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GroupSuggestion } from '@shared/api/types';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Field, Button, Card, AppBar, Badge, Divider, EmptyState } from '../../components/ui';
import { createGroup, discoverGroups, getProduct } from '../../lib/api/endpoints';
import { ApiClientError } from '../../lib/api/client';
import { formatFcfa, pluralizeUnit } from '../../lib/format';
import { useAuthToken } from '../../lib/hooks/useAuthToken';

const DUREES = [24, 48, 72] as const;

export default function CreerGroupeScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const idProduit = Number(productId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authEnCours } = useAuthToken();

  const { data: produit } = useQuery({
    queryKey: ['product', idProduit],
    queryFn: () => getProduct(idProduit),
    enabled: Number.isFinite(idProduit),
  });

  const [nom, setNom] = useState('');
  const [objectif, setObjectif] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maQuantite, setMaQuantite] = useState('1');
  const [duree, setDuree] = useState<number>(48);
  const [erreur, setErreur] = useState<string | null>(null);

  /** Suggestions IA-3 : tant qu'elles sont à l'écran, la création est suspendue. */
  const [suggestions, setSuggestions] = useState<GroupSuggestion[] | null>(null);

  const unite = produit?.unit_label ?? 'unité';

  const problemes = useMemo(() => {
    const liste: string[] = [];
    const cible = Number(objectif);
    const mini = Number(minimum);
    const part = Number(maQuantite);

    if (!nom.trim()) liste.push('Donnez un nom à votre groupe.');
    if (!Number.isFinite(cible) || cible < 1) liste.push('Indiquez un objectif.');
    if (!Number.isFinite(mini) || mini < 1) liste.push('Indiquez un minimum.');
    if (cible >= 1 && mini >= 1 && mini > cible) {
      liste.push('Le minimum ne peut pas dépasser l’objectif.');
    }
    if (!Number.isFinite(part) || part < 1) liste.push('Commandez au moins une unité.');
    if (produit && cible > produit.stock) {
      liste.push(`Le stock disponible est de ${produit.stock} ${pluralizeUnit(unite, produit.stock)}.`);
    }
    return liste;
  }, [nom, objectif, minimum, maQuantite, produit, unite]);

  const recherche = useMutation({
    mutationFn: () => discoverGroups({ query: nom.trim(), product_id: idProduit }),
  });

  const creation = useMutation({
    mutationFn: () =>
      createGroup({
        product_id: idProduit,
        name: nom.trim(),
        target_quantity: Number(objectif),
        min_quantity: Number(minimum),
        deadline_hours: duree,
        quantity: Number(maQuantite),
      }),
    onSuccess: (groupe) => {
      queryClient.setQueryData(['group', groupe.id], groupe);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace(`/groupe/${groupe.id}`);
    },
    onError: (raison) => {
      setErreur(
        raison instanceof ApiClientError ? raison.message : 'La création du groupe a échoué.',
      );
    },
  });

  /** Première étape : chercher un doublon. Le repli du serveur est silencieux. */
  async function continuer() {
    setErreur(null);
    if (problemes.length > 0) {
      setErreur('Corrigez les informations ci-dessus.');
      return;
    }
    try {
      const reponse = await recherche.mutateAsync();
      if (reponse.suggestions.length > 0) {
        setSuggestions(reponse.suggestions);
        return;
      }
    } catch {
      // La découverte est un confort, jamais un obstacle : si elle échoue,
      // on crée le groupe comme si elle n'existait pas.
    }
    creation.mutate();
  }

  if (authEnCours) return <View style={styles.screen} />;

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <AppBar title="Créer un groupe" onBack={() => router.back()} />
        <EmptyState
          title="Connectez-vous"
          subtitle="Il faut un compte pour lancer un groupe d’achat."
          actionLabel="Se connecter"
          onAction={() =>
            router.push(`/(auth)/connexion?redirectTo=/creer-groupe/${idProduit}`)
          }
        />
      </View>
    );
  }

  // ── Interception IA-3 ────────────────────────────────────────────
  if (suggestions) {
    return (
      <View style={styles.screen}>
        <AppBar title="Un groupe existe déjà" onBack={() => setSuggestions(null)} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="body" tone="muted">
            En rejoignant un groupe existant plutôt qu’en créant le vôtre, vous
            atteignez le palier suivant plus vite — et tout le monde paie moins cher.
          </Text>

          {suggestions.map(({ group, reason }) => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              onPress={() => router.replace(`/groupe/${group.id}`)}
            >
              <Card variant="elevated" style={styles.card}>
                <View style={styles.ligne}>
                  <Text variant="label">{group.name}</Text>
                  <Badge label={`${group.participants_count} participants`} />
                </View>
                <Text variant="caption" tone="muted">
                  {reason}
                </Text>
                <Divider />
                <View style={styles.ligne}>
                  <Text variant="body" tabularNums>
                    {group.current_quantity} / {group.target_quantity}{' '}
                    {pluralizeUnit(unite, group.current_quantity)}
                  </Text>
                  <Text variant="label" tone="success" tabularNums>
                    {formatFcfa(group.current_unit_price)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.barre}>
          <Button
            label={creation.isPending ? 'Création…' : 'Créer quand même'}
            variant="secondary"
            loading={creation.isPending}
            onPress={() => creation.mutate()}
          />
        </View>
      </View>
    );
  }

  // ── Formulaire ───────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <AppBar
        title="Créer un groupe"
        subtitle={produit?.name}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {produit && (
          <Card variant="elevated" style={styles.card}>
            <Text variant="caption" tone="muted">
              Prix de détail
            </Text>
            <Text variant="heading" tabularNums>
              {formatFcfa(produit.individual_price)}
            </Text>
            <Text variant="caption" tone="muted">
              Meilleur prix de la grille :{' '}
              {formatFcfa(produit.tiers[produit.tiers.length - 1]?.unit_price ?? produit.individual_price)}{' '}
              à partir de {produit.tiers[produit.tiers.length - 1]?.min_quantity ?? 1}{' '}
              {pluralizeUnit(unite, produit.tiers[produit.tiers.length - 1]?.min_quantity ?? 1)}
            </Text>
          </Card>
        )}

        <Field
          label="Nom du groupe"
          placeholder="Producteurs de Kovié"
          value={nom}
          onChangeText={setNom}
        />
        <Field
          label={`Objectif (${pluralizeUnit(unite, 2)})`}
          keyboardType="number-pad"
          value={objectif}
          onChangeText={setObjectif}
        />
        <Field
          label={`Minimum pour que le groupe tienne (${pluralizeUnit(unite, 2)})`}
          keyboardType="number-pad"
          value={minimum}
          onChangeText={setMinimum}
        />
        <Field
          label="Ma commande"
          keyboardType="number-pad"
          value={maQuantite}
          onChangeText={setMaQuantite}
        />

        <View>
          <Text variant="label" tone="muted">
            Durée avant clôture
          </Text>
          <View style={styles.durees}>
            {DUREES.map((h) => (
              <Pressable
                key={h}
                accessibilityRole="button"
                accessibilityState={{ selected: duree === h }}
                onPress={() => setDuree(h)}
                style={[styles.duree, duree === h && styles.dureeActive]}
              >
                <Text variant="label" tone={duree === h ? 'ink' : 'muted'}>
                  {h} h
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {problemes.length > 0 && (
          <View style={styles.problemes}>
            {problemes.map((p) => (
              <Text key={p} variant="caption" tone="muted">
                • {p}
              </Text>
            ))}
          </View>
        )}

        {erreur && (
          <Text variant="label" tone="alert">
            {erreur}
          </Text>
        )}

        <Text variant="caption" tone="muted">
          Sous le minimum à l’échéance, le groupe est annulé et personne n’est débité.
        </Text>
      </ScrollView>

      <View style={styles.barre}>
        <Button
          label={
            recherche.isPending
              ? 'Vérification…'
              : creation.isPending
                ? 'Création…'
                : 'Créer le groupe'
          }
          loading={recherche.isPending || creation.isPending}
          disabled={problemes.length > 0}
          onPress={continuer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surface.white, gap: spacing.xs },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  durees: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  duree: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface.white,
  },
  dureeActive: { borderColor: colors.brand.ink, backgroundColor: colors.brand.yellow },
  problemes: { gap: spacing.xs },
  barre: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface.white,
  },
});
