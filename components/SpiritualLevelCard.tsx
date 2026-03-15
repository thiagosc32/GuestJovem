/**
 * Nível Espiritual - card visual da etapa na jornada (Semente, Raiz, Caule, Fruto, Colheita).
 * Mesmo sistema visual do card de Vida Espiritual, porém ligado ao nível/etapa da jornada.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { SHADOWS } from '../constants/theme';
import { JOURNEY_LEVEL_IMAGES } from '../constants/journeyLevelImages';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 180;
const STROKE_WIDTH = 12;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface SpiritualLevelCardProps {
  levelName: string;
  level: number;
  shortDescription?: string;
  verse?: string;
  progressPercent: number;
}

const LEVEL_RING_COLORS: Record<number, string> = {
  1: '#22C55E',
  2: '#3B82F6',
  3: COLORS.spiritualGold,
  4: '#F97316',
  5: '#8B5CF6',
};

/** Mesma proporção do avatar da Vida Espiritual (SpiritualCompanion): 140x140, círculo */
const AVATAR_SIZE = 140;

export default function SpiritualLevelCard({
  levelName,
  level,
  shortDescription,
  verse,
  progressPercent,
}: SpiritualLevelCardProps) {
  const ringColor = LEVEL_RING_COLORS[level] ?? COLORS.primary;
  const fill = Math.min(1, progressPercent / 100);

  const ringProgress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    ringProgress.value = 0;
    ringProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [level]);

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill * ringProgress.value),
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Seu nível na jornada</Text>
        <View style={[styles.badgePill, { backgroundColor: ringColor + '22' }]}>
          <Text style={[styles.badge, { color: ringColor }]}>{levelName}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Animated.View style={[styles.ringWrap, animatedRingStyle]}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
            <Defs>
              <LinearGradient id="levelRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={ringColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={ringColor} stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={STROKE_WIDTH}
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="url(#levelRingGrad)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              animatedProps={animatedRingProps}
            />
          </Svg>
          <View style={styles.ringCenter}>
            {JOURNEY_LEVEL_IMAGES[level] != null ? (
              <View style={styles.avatarCircle}>
                <Image
                  source={JOURNEY_LEVEL_IMAGES[level]}
                  style={styles.levelAvatarImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}
          </View>
        </Animated.View>
        {shortDescription != null && shortDescription !== '' && (
          <Text style={styles.message}>{shortDescription}</Text>
        )}
        {verse != null && verse !== '' && (
          <Text style={styles.verse}>— {verse}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.LG,
    marginHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgePill: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  ringSvg: {
    position: 'absolute',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  levelAvatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  verse: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
});
