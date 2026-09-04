/**
 * KashFlow — CounterDisplay
 * Compte de l'ancienne à la nouvelle valeur à chaque changement (cf. docs/design/motion.md).
 * Chiffres tabulaires obligatoires : sans chasse fixe, l'animation fait sauter le texte
 * voisin latéralement.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { motion } from '@shared/theme/tokens';
import { Text, type TextComponentProps } from './Text';

export interface CounterDisplayProps extends Pick<TextComponentProps, 'variant' | 'tone' | 'style'> {
  value: number;
}

export function CounterDisplay({ value, variant = 'heading', tone = 'ink', style }: CounterDisplayProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animatedValue = useRef(new Animated.Value(value)).current;
  const previousValue = useRef(value);

  useEffect(() => {
    if (value === previousValue.current) return;

    const listenerId = animatedValue.addListener(({ value: v }) => setDisplayValue(Math.round(v)));

    Animated.timing(animatedValue, {
      toValue: value,
      duration: motion.counterIncrementMs,
      useNativeDriver: false, // on écoute la valeur en JS pour la reformater à chaque frame
    }).start(() => animatedValue.removeListener(listenerId));

    previousValue.current = value;

    return () => animatedValue.removeListener(listenerId);
  }, [value, animatedValue]);

  return (
    <Text variant={variant} tone={tone} tabularNums style={style}>
      {displayValue.toLocaleString('fr-FR')}
    </Text>
  );
}
