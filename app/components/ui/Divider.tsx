import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/tokens';

export function Divider({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: { height: 1, backgroundColor: colors.line },
});
