/**
 * Navigation principale — barre d'onglets.
 *
 * Avant, l'application n'avait qu'une pile : « Mes groupes » et « Mes commandes »
 * n'étaient atteignables qu'en passant par le profil, lui-même caché derrière une
 * icône de l'accueil. Deux des quatre destinations utiles étaient donc à trois
 * touchers, et rien n'indiquait à l'utilisateur où il se trouvait.
 *
 * La barre porte l'encart bas du système : sur Android à navigation gestuelle,
 * des onglets posés à `bottom: 0` passent sous la barre de geste.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@shared/theme/tokens';
import { typeScale, fontWeights } from '@shared/theme/typography';

/** Taille d'icône des onglets, reprise dans le calcul de hauteur de la barre. */
const ICONE = 24;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.ink,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          // Icône (24) + libellé (16) + respiration. La première version calait
          // la hauteur sur la cible tactile minimale : les libellés étaient
          // tronqués par le bas, ce qui ne se voit qu'au rendu.
          height: ICONE + typeScale.caption.lineHeight + spacing.xl + insets.bottom,
          paddingBottom: insets.bottom + spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          backgroundColor: colors.surface.white,
        },
        tabBarLabelStyle: {
          fontSize: typeScale.caption.size,
          fontWeight: fontWeights.bodyMedium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={ICONE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mes-groupes"
        options={{
          title: 'Mes groupes',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={ICONE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mes-commandes"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={ICONE} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={ICONE} color={color} />,
        }}
      />
    </Tabs>
  );
}
