/**
 * KashFlow — PriceDisplay
 * Le plus gros élément de l'écran groupe (D'après <principe_directeur>). Chiffres
 * tabulaires obligatoires. `highlightChange` déclenche la moitié « prix » de la séquence
 * de déblocage de palier décrite dans docs/design/motion.md : c'est l'écran qui décide
 * quand la mettre à vrai (comparaison de current_tier entre deux polls) et pendant
 * combien de temps la garder (± 4 s, durée du bandeau de déblocage).
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '@shared/theme/tokens';
import { typeScale, fontFamilies, fontWeights } from '@shared/theme/typography';
import { motion } from '@shared/theme/tokens';
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
  size?: 'display' | 'heading';
}

export function PriceDisplay({ value, previousValue, unitLabel, highlightChange = false, size = 'display' }: PriceDisplayProps) {
  const colorAnim = useRef(new Animated.Value(0)).current; // 0 = ink, 1 = unlock.green
  const oldPriceAnim = useRef(new Animated.Value(0)).current; // 0 = caché, 1 = visible

  useEffect(() => {
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
  }, [highlightChange, colorAnim, oldPriceAnim]);

  const scale = typeScale[size];

  return (
    <View>
      {previousValue !== undefined && previousValue !== value && (
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
          {formatFcfa(previousValue)}
        </Animated.Text>
      )}
      <Animated.Text
        style={[
          styles.price,
          {
            fontFamily: resolveNativeFontFamily(scale.fontFamily, scale.weight),
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
