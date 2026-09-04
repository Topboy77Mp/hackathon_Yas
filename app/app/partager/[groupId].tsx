/**
 * Partager — le mécanisme de croissance du produit (P0 du <perimetre>).
 *
 * Les messages viennent d'IA-2 (`POST /ai/share-message`), qui renvoie aussi le
 * lien du groupe. Le backend a un repli déterministe : même sans clé API, trois
 * messages arrivent. L'écran n'a donc pas d'état « service indisponible » à gérer,
 * seulement une panne réseau.
 */
import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Button, Card, AppBar, EmptyState, Divider } from '../../components/ui';
import { generateShareMessage } from '../../lib/api/endpoints';
import { shareToWhatsApp } from '../../lib/whatsapp-share';

/** Libellés lisibles : le backend renvoie des clés brutes. */
const REGISTRES: Record<string, string> = {
  famille: 'Pour la famille',
  familial: 'Pour la famille',
  cooperative: 'Pour la coopérative',
  professionnel: 'Pour les collègues',
  association: "Pour l'association",
  associatif: "Pour l'association",
};

export default function PartagerScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const groupIdNum = Number(groupId);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['share-message', groupIdNum],
    queryFn: () => generateShareMessage({ group_id: groupIdNum }),
    enabled: Number.isFinite(groupIdNum),
    // Les messages ne changent pas d'une seconde à l'autre : inutile de
    // rappeler un modèle de langage à chaque retour sur l'écran.
    staleTime: 5 * 60 * 1000,
  });

  async function copier(texte: string, index: number) {
    await Clipboard.setStringAsync(texte);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <View style={styles.screen}>
      <AppBar title="Inviter des proches" onBack={() => router.back()} />

      {isLoading && (
        <View style={styles.content}>
          <View style={[styles.skeleton, { height: 56 }]} />
          <View style={[styles.skeleton, { height: 120 }]} />
          <View style={[styles.skeleton, { height: 120 }]} />
        </View>
      )}

      {isError && (
        <EmptyState
          title="Messages indisponibles"
          subtitle="La connexion au serveur a échoué."
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      )}

      {data && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Card variant="elevated" style={styles.linkCard}>
              <Text variant="label" tone="muted">
                Lien du groupe
              </Text>
              <Text variant="body" selectable>
                {data.share_url}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copier le lien du groupe"
                onPress={() => copier(data.share_url, -1)}
                style={styles.copyLink}
              >
                <Text variant="label" tone="success">
                  {copiedIndex === -1 ? 'Lien copié' : 'Copier le lien'}
                </Text>
              </Pressable>
            </Card>

            <Text variant="label" tone="muted">
              Choisissez le ton qui correspond à vos proches.
            </Text>

            {data.variants.map((variante, index) => (
              <Card variant="elevated" key={variante.registre} style={styles.variantCard}>
                <Text variant="label">
                  {REGISTRES[variante.registre.toLowerCase()] ?? variante.registre}
                </Text>
                <Text variant="body" tone="muted">
                  {variante.texte}
                </Text>
                <Divider />
                <View style={styles.variantActions}>
                  <Button
                    label={copiedIndex === index ? 'Copié' : 'Copier'}
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => copier(variante.texte, index)}
                  />
                  <Button
                    label="Envoyer sur WhatsApp"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => shareToWhatsApp(variante.texte)}
                  />
                </View>
              </Card>
            ))}
          </ScrollView>

          <View style={styles.actionBar}>
            <Button
              label="Partager maintenant"
              onPress={() =>
                shareToWhatsApp(data.variants[0]?.texte ?? data.share_url)
              }
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.page },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  skeleton: { backgroundColor: colors.surface.raised, borderRadius: radii.card },
  linkCard: { backgroundColor: colors.surface.white, gap: spacing.xs },
  copyLink: { paddingTop: spacing.xs },
  variantCard: { backgroundColor: colors.surface.white, gap: spacing.sm },
  variantActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBar: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface.white,
  },
});
