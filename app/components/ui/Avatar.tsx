/**
 * KashFlow — Avatar
 * Initiales sur pastille. Aucune photo utilisateur dans le périmètre (cf. <exclus>) :
 * les initiales suffisent à donner un visage au groupe.
 */
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '@shared/theme/tokens';
import { typeScale } from '@shared/theme/typography';
import { resolveNativeFontFamily } from './nativeFont';
import { Text } from './Text';

export interface AvatarProps {
  initials: string;
  size?: number;
}

export function Avatar({ initials, size = 36 }: AvatarProps) {
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
      <Text
        variant="label"
        tone="muted"
        style={{
          fontFamily: resolveNativeFontFamily(typeScale.heading.fontFamily, typeScale.heading.weight),
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radii.pill,
    backgroundColor: colors.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
