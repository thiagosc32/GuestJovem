import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award, CheckCircle } from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { Achievement } from '../types/models';

interface AchievementBadgeProps {
  achievement: Achievement;
}

export default function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;

  return (
    <View style={[styles.container, !isUnlocked && styles.containerLocked]}>
      <View style={[styles.iconContainer, { backgroundColor: isUnlocked ? `${COLORS.success}20` : `${COLORS.border}` }]}>
        {isUnlocked ? (
          <CheckCircle size={32} color={COLORS.success} />
        ) : (
          <Award size={32} color={COLORS.textLight} />
        )}
      </View>
      <Text style={[styles.title, !isUnlocked && styles.titleLocked]}>{achievement.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {achievement.description}
      </Text>
      {!isUnlocked && (
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={progressPercentage / 100}
            width={null}
            height={4}
            color={COLORS.primary}
            unfilledColor={COLORS.border}
            borderWidth={0}
            borderRadius={2}
          />
          <Text style={styles.progressText}>
            {achievement.progress} / {achievement.maxProgress}
          </Text>
        </View>
      )}
      {isUnlocked && achievement.unlockedAt && (
        <Text style={styles.unlockedDate}>
          Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
    width: 160,
    ...SHADOWS.small,
  },
  containerLocked: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.XS,
  },
  titleLocked: {
    color: COLORS.textSecondary,
  },
  description: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  progressContainer: {
    width: '100%',
    marginTop: SPACING.XS,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.XS,
    color: COLORS.primary,
    fontWeight: '600',
  },
  unlockedDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginTop: SPACING.XS,
  },
});