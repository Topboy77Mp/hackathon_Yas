/**
 * expo-google-fonts charge chaque poids sous un nom de police distinct (ex. "Archivo_700Bold")
 * — ce nom exact doit être utilisé comme fontFamily. Le mettre à "Archivo" + fontWeight séparé
 * ne matche aucune police enregistrée sur le web (retombe silencieusement sur une police
 * système serif). tokens/typography.ts reste volontairement générique (family + weight) car
 * les primitifs /dashboard, eux, chargeront ces mêmes polices via CSS standard où
 * family + font-weight fonctionne normalement : cette résolution est donc spécifique à /app,
 * pas au contrat de tokens partagé.
 */
import { fontFamilies, fontWeights } from '@shared/theme/typography';

export function resolveNativeFontFamily(family: string, weight: string): string {
  if (family === fontFamilies.numbers) {
    return weight === fontWeights.numbersBold ? 'Archivo_700Bold' : 'Archivo_600SemiBold';
  }
  return weight === fontWeights.bodyMedium ? 'Inter_500Medium' : 'Inter_400Regular';
}
