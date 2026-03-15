/**
 * Barra de progresso da jornada espiritual (etapa atual e passos no nível).
 * Usada na tela da Jornada e opcionalmente no Dashboard.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { GROWTH_UNIT_LABEL } from '../constants/spiritualJourney';

export interface SpiritualProgressBarProps {
  levelName: string;
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  totalXp?: number;
  streakWeeks?: number;
  compact?: boolean;
  levelDescription?: string;
  levelVerse?: string;
  levelInspirationalPhrase?: string;
}

export default function SpiritualProgressBar({
  levelName,
  level,
  xpInCurrentLevel,
  xpNeededForNextLevel,
  progressPercent,
  totalXp,
  streakWeeks,
  compact = false,
  levelDescription,
  levelVerse,
  levelInspirationalPhrase,
}: SpiritualProgressBarProps) {
  const hasNextLevel = xpNeededForNextLevel > 0;
  const progress = hasNextLevel ? progressPercent / 100 : 1;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <Text style={styles.compactLevelName}>{levelName}</Text>
          {hasNextLevel && (
            <Text style={styles.compactXp}>
              {xpInCurrentLevel}/{xpNeededForNextLevel} {GROWTH_UNIT_LABEL}
            </Text>
          )}
        </View>
        <Progress.Bar
          progress={progress}
          width={null}
          height={6}
          color={COLORS.spiritualGold}
          unfilledColor={COLORS.border}
          borderWidth={0}
          borderRadius={3}
          style={styles.compactBar}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelLabel}>Nível {level}</Text>
        {streakWeeks !== undefined && streakWeeks > 0 && (
          <Text style={styles.streakText}>🔥 {streakWeeks} semana{streakWeeks !== 1 ? 's' : ''}</Text>
        )}
      </View>
      <Text style={styles.levelName}>{levelName}</Text>
      {(levelDescription != null || levelVerse != null || levelInspirationalPhrase != null) && (
        <View style={styles.levelDescriptionWrap}>
          {levelDescription != null && (
            <Text style={styles.levelDescription}>{levelDescription}</Text>
          )}
          {levelVerse != null && (
            <Text style={styles.levelVerse}>— {levelVerse}</Text>
          )}
          {levelInspirationalPhrase != null && (
            <Text style={styles.levelInspirationalPhrase}>"{levelInspirationalPhrase}"</Text>
          )}
        </View>
      )}
      <Progress.Bar
        progress={progress}
        width={null}
        height={10}
        color={COLORS.spiritualGold}
        unfilledColor={COLORS.border}
        borderWidth={0}
        borderRadius={5}
        style={styles.progressBar}
      />
      <View style={styles.footer}>
        {totalXp !== undefined && <Text style={styles.totalXp}>{totalXp} {GROWTH_UNIT_LABEL} na jornada</Text>}
        {hasNextLevel && (
          <Text style={styles.xpInLevel}>
            {xpInCurrentLevel} / {xpNeededForNextLevel} {GROWTH_UNIT_LABEL} neste nível
          </Text>
        )}
        {!hasNextLevel && <Text style={styles.maxLevel}>Último nível da jornada</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  levelLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  streakText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  levelName: {
    ...TYPOGRAPHY.h2,
  },
  levelDescriptionWrap: {
    marginTop: SPACING.XS,
    marginBottom: SPACING.SM,
  },
  levelDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  levelVerse: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  levelInspirationalPhrase: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.SM,
    paddingHorizontal: SPACING.SM,
  },
  levelNameOnly: {
    color: COLORS.text,
    marginBottom: SPACING.MD,
  },
  progressBar: {
    marginBottom: SPACING.SM,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalXp: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  xpInLevel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  maxLevel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    fontWeight: '600',
  },
  compactContainer: {
    marginVertical: SPACING.XS,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactLevelName: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  compactXp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  compactBar: {},
});
