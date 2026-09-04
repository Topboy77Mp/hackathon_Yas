/**
 * KashFlow — EmptyState
 * « Un état vide n'est pas un message d'excuse, c'est une invitation à agir »
 * (cf. <exigences> AGENT_UI). Toujours accompagné d'une action quand il y en a une.
 */
import { View, StyleSheet } from 'react-native';
import { spacing } from '@shared/theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" tone="muted" align="center">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && <Button label={actionLabel} variant="secondary" fullWidth={false} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
});
