import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { colors } from '@shared/theme/tokens';
import { queryClient } from '../lib/query-client';
import { paperTheme } from '../lib/paperTheme';
import { useOnboarding } from '../lib/onboarding';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { onboardingVu, enCoursDeLecture } = useOnboarding();

  const [fontsLoaded, fontError] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  // Le splash reste affiché tant que les polices ET la décision d'onboarding ne
  // sont pas prêtes : le masquer plus tôt ferait clignoter l'accueil avant la
  // redirection vers l'introduction.
  useEffect(() => {
    if ((fontsLoaded || fontError) && !enCoursDeLecture) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, enCoursDeLecture]);

  useEffect(() => {
    if (enCoursDeLecture || onboardingVu !== false) return;
    // Déjà sur l'introduction : ne pas rediriger en boucle.
    if (segments[0] === 'onboarding') return;
    router.replace('/onboarding');
  }, [enCoursDeLecture, onboardingVu, segments, router]);

  if ((!fontsLoaded && !fontError) || enCoursDeLecture) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface.page },
            }}
          >
            <Stack.Screen name="rejoindre/[groupId]" options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
