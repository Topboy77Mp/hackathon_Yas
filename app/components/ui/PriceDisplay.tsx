/**
 * KashFlow — PriceDisplay
 * Le plus gros élément de l'écran groupe (D'après <principe_directeur>). Chiffres
 * tabulaires obligatoires, toujours en graisse ExtraBold (contrat v2 — contraste de prix
 * maximal, réservé aux prix, jamais aux titres).
 *
 * Deux façons de montrer un ancien prix barré, pour deux besoins différents :
 * — `highlightChange` : la séquence ANIMÉE de déblocage de palier sur l'écran groupe
 *   (docs/design/motion.md), déclenchée une fois par l'écran quand current_tier change.
 * — `savingsAchieved` : affichage STATIQUE « prix normal barré à côté du prix de groupe »
 *   sur une carte catalogue qui a déjà un groupe ouvert moins cher — pas d'animation,
 *   juste la comparaison. Le vert est permanent : quelque chose a déjà été gagné.
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, motion } from '@shared/theme/tokens';
import { typeScale, fontFamilies, fontWeights } from '@shared/theme/typography';
import { Text } from './Text';
import { resolveNativeFontFamily } from './nativeFont';

function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

export interface PriceDisplayProps {
  value: number;
  previousValue?: number;
  unitLabel?: string;
  highlightChange?: boolean;
  savingsAchieved?: boolean;
  size?: 'display' | 'heading';
}

export function PriceDisplay({
  value,
  previousValue,
  unitLabel,
  highlightChange = false,
  savingsAchieved = false,
  size = 'display',
}: PriceDisplayProps) {
  const colorAnim = useRef(new Animated.Value(savingsAchieved ? 1 : 0)).current; // 0 = ink, 1 = unlock.green
  const oldPriceAnim = useRef(new Animated.Value(savingsAchieved ? 1 : 0)).current; // 0 = caché, 1 = visible

  useEffect(() => {
    if (savingsAchieved && !highlightChange) {
      colorAnim.setValue(1);
      oldPriceAnim.setValue(1);
      return;
    }
    if (!highlightChange) {
      colorAnim.setValue(0);
      oldPriceAnim.setValue(0);
      return;
    }
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(colorAnim, { toValue: 1, duration: motion.priceSwapMs, useNativeDriver: false }),
        Animated.timing(oldPriceAnim, { toValue: 1, duration: motion.priceSwapMs, useNativeDriver: false }),
      ]).start();
    }, motion.priceSwapDelayMs);
    return () => clearTimeout(timer);
  }, [highlightChange, savingsAchieved, colorAnim, oldPriceAnim]);

  const scale = typeScale[size];
  const showOldPrice = previousValue !== undefined && previousValue !== value;

  return (
    <View>
      {showOldPrice && (
        <Animated.Text
          style={[
            styles.oldPrice,
            {
              fontFamily: resolveNativeFontFamily(fontFamilies.numbers, fontWeights.numbersSemiBold),
              opacity: oldPriceAnim,
              transform: [{ translateY: oldPriceAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
            },
          ]}
        >
          {formatFcfa(previousValue as number)}
        </Animated.Text>
      )}
      <Animated.Text
        style={[
          styles.price,
          {
            fontFamily: resolveNativeFontFamily(fontFamilies.numbers, fontWeights.numbersExtraBold),
            fontSize: scale.size,
            lineHeight: scale.lineHeight,
            color: colorAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.brand.ink, colors.unlock.green] }),
          },
        ]}
      >
        {formatFcfa(value)}
      </Animated.Text>
      {unitLabel && (
        <Text variant="caption" tone="muted">
          {unitLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  oldPrice: {
    fontSize: typeScale.label.size,
    lineHeight: typeScale.label.lineHeight,
    color: colors.text.muted,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  price: {
    fontVariant: ['tabular-nums'],
  },
});
