/**
 * Vida Espiritual - representação visual do estado de constância (Ovelinha)
 * A ovelinha simboliza a vida espiritual da pessoa (não representa Deus).
 * Linguagem pastoral, sem punição.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
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
import type { SpiritualCompanionState } from '../types/spiritualCompanion';
import type { CompanionStateKey } from '../constants/spiritualCompanion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 180;
const STROKE_WIDTH = 12;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export interface SpiritualCompanionProps {
  /** Estado já calculado (evita o componente fazer fetch) */
  companion: SpiritualCompanionState | null;
  /** Opcional: compacto (só ícone + uma linha) */
  compact?: boolean;
}

const STATE_COLORS: Record<CompanionStateKey, string> = {
  strong: COLORS.spiritualGold,
  weakening: COLORS.secondary,
  weak: COLORS.textSecondary,
  bones: COLORS.textLight,
};

const RING_COLORS: Record<CompanionStateKey, string> = {
  strong: '#22C55E',
  weakening: '#EAB308',
  weak: '#F97316',
  bones: '#EF4444',
};

const STATE_FILL: Record<CompanionStateKey, number> = {
  strong: 1,
  weakening: 0.72,
  weak: 0.44,
  bones: 0.2,
};

const STATE_IMAGES: Record<CompanionStateKey, ImageSourcePropType> = {
  strong: require('../assets/ovelhas/ovelha-strong.png'),
  weakening: require('../assets/ovelhas/ovelha-weakening.png'),
  weak: require('../assets/ovelhas/ovelha-weak.png'),
  bones: require('../assets/ovelhas/ovelha-bones.png'),
};

export default function SpiritualCompanion({ companion, compact = false }: SpiritualCompanionProps) {
  if (!companion) return null;

  const { state, message, label } = companion;
  const color = STATE_COLORS[state];
  const ringColor = RING_COLORS[state];
  const fill = STATE_FILL[state];
  const imageSource = STATE_IMAGES[state];

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
  }, [state]);

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill * ringProgress.value),
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={[styles.compactImageWrap, { borderColor: color + '40' }]}>
          <Image source={imageSource} style={styles.compactImage} resizeMode="cover" />
        </View>
        <View style={styles.compactTextWrap}>
          <Text style={[styles.compactLabel, { color }]} numberOfLines={1}>{label}</Text>
          <Text style={styles.compactMessage} numberOfLines={2}>{message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Vida Espiritual</Text>
        <View style={[styles.badgePill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badge, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Animated.View style={[styles.ringWrap, animatedRingStyle]}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
            <Defs>
              <LinearGradient id="sheepRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
              stroke="url(#sheepRingGrad)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              animatedProps={animatedRingProps}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <View style={styles.avatarCircle}>
              <Image source={imageSource} style={styles.stateImage} resizeMode="cover" />
            </View>
          </View>
        </Animated.View>
        <Text style={styles.message}>{message}</Text>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
  },
  stateImage: {
    width: 140,
    height: 140,
  },
  iconWrapCompact: {
    marginRight: SPACING.MD,
  },
  compactImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
  },
  compactImage: {
    width: 56,
    height: 56,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTextWrap: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
