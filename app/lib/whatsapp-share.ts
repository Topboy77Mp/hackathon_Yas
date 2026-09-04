/**
 * KashFlow — Partage WhatsApp, trois niveaux de repli (cf. exigences AGENT_FRONT) :
 * whatsapp://send → partage natif → copie du lien. Testé sur un téléphone inconnu
 * devant un jury, donc jamais d'échec silencieux.
 */
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareOutcome = 'whatsapp' | 'native-share' | 'clipboard';

export async function shareToWhatsApp(text: string): Promise<ShareOutcome> {
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;

  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
      return 'whatsapp';
    }
  } catch {
    // repli silencieux vers le niveau suivant
  }

  try {
    const result = await Share.share({ message: text });
    if (result.action !== Share.dismissedAction) {
      return 'native-share';
    }
  } catch {
    // repli silencieux vers le niveau suivant
  }

  await Clipboard.setStringAsync(text);
  return 'clipboard';
}
