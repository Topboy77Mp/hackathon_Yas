/**
 * Onboarding — trois écrans, une seule fois.
 *
 * Contenu strictement dérivé du produit : ce que fait KashFlow, pourquoi le prix
 * baisse, et ce qu'apporte le partage. Aucune promesse inventée, aucun chiffre
 * qui ne vienne pas du jeu de démonstration.
 */
import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Pressable,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '@shared/theme/tokens';
import { Text, Button } from '../components/ui';
import { marquerOnboardingVu } from '../lib/onboarding';

interface Etape {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  description: string;
}

const ETAPES: Etape[] = [
  {
    icone: 'people',
    titre: 'Achetez à plusieurs',
    description:
      "Rejoignez un groupe d'acheteurs pour le même produit, chez le même commerçant.",
  },
  {
    icone: 'trending-down',
    titre: 'Le prix baisse pour tout le monde',
    description:
      'À chaque palier franchi, le nouveau prix s’applique rétroactivement — y compris à ceux qui ont commandé avant vous.',
  },
  {
    icone: 'share-social',
    titre: 'Invitez, et payez moins',
    description:
      'Partagez le lien du groupe sur WhatsApp. Plus le groupe grandit, plus le prix descend.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);

  async function terminer() {
    await marquerOnboardingVu();
    router.replace('/');
  }

  function suivant() {
    if (index >= ETAPES.length - 1) return terminer();
    const prochain = index + 1;
    setIndex(prochain);
    scroll.current?.scrollTo({ x: prochain * width, animated: true });
  }

  function auDefilement(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const position = Math.round(e.nativeEvent.contentOffset.x / width);
    if (position !== index) setIndex(position);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Passer l’introduction"
        onPress={terminer}
        style={styles.passer}
      >
        <Text variant="label" tone="muted">
          Passer
        </Text>
      </Pressable>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={auDefilement}
        style={styles.pages}
      >
        {ETAPES.map((etape) => (
          <View key={etape.titre} style={[styles.page, { width }]}>
            <View style={styles.illustration}>
              <Ionicons name={etape.icone} size={64} color={colors.brand.ink} />
            </View>
            <Text variant="title" align="center">
              {etape.titre}
            </Text>
            <Text variant="body" tone="muted" align="center">
              {etape.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bas}>
        <View
          style={styles.points}
          accessibilityRole="progressbar"
          accessibilityLabel={`Étape ${index + 1} sur ${ETAPES.length}`}
        >
          {ETAPES.map((etape, i) => (
            <View key={etape.titre} style={[styles.point, i === index && styles.pointActif]} />
          ))}
        </View>

        <Button
          label={index === ETAPES.length - 1 ? 'Commencer' : 'Continuer'}
          onPress={suivant}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  passer: { alignSelf: 'flex-end', padding: spacing.lg },
  pages: { flexGrow: 0 },
  page: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  bas: { marginTop: 'auto', padding: spacing.xl, gap: spacing.xl },
  points: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  point: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.line,
  },
  pointActif: { width: 24, backgroundColor: colors.brand.ink },
});
