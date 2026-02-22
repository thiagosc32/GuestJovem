import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../constants/theme';

interface ProgressCardProps {
  title: string;
  progress: number;
  color: string;
  subtitle?: string;
}

export default function ProgressCard({ title, progress, color, subtitle }: ProgressCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.percentage, { color }]}>{progress}%</Text>
      </View>
      <Progress.Bar
        progress={progress / 100}
        width={null}
        height={8}
        color={color}
        unfilledColor={COLORS.border}
        borderWidth={0}
        borderRadius={4}
        style={styles.progressBar}
      />
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  percentage: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  progressBar: {
    marginBottom: SPACING.SM,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
});