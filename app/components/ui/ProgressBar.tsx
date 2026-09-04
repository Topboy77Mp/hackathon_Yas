/**
 * KashFlow — ProgressBar
 * Seule zone jaune de l'écran groupe hors bouton d'action (cf. <regle_couleur>).
 * S'anime à chaque changement de `value`, y compris hors déblocage de palier — c'est le
 * même mécanisme (cf. docs/design/motion.md).
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, motion, radii } from '@shared/theme/tokens';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  height?: number;
}

export function ProgressBar({ value, height = 12 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const widthAnim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration: motion.progressBarFillMs,
      useNativeDriver: false, // 'width' n'est pas animable par le native driver
    }).start();
  }, [clamped, widthAnim]);

  return (
    <View style={[styles.track, { height, borderRadius: radii.pill }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: radii.pill,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surface.raised, overflow: 'hidden' },
  fill: { backgroundColor: colors.brand.yellow },
});
