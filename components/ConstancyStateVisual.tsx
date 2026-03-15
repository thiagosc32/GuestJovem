/**
 * Indicador visual do estado da constância (Vida Espiritual).
 * Anel circular com cores por estado (verde → amarelo → laranja → vermelho) e efeito animado.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
import { Flame } from 'lucide-react-native';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import type { CompanionStateKey } from '../constants/spiritualCompanion';

const RING_SIZE = 160;
const STROKE_WIDTH = 14;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATE_COLORS: Record<CompanionStateKey, string> = {
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

const STATE_LABELS: Record<CompanionStateKey, string> = {
  strong: 'Forte',
  weakening: 'Cansada',
  weak: 'Fraca',
  bones: 'Perdida',
};

export interface ConstancyStateVisualProps {
  state: CompanionStateKey;
  size?: number;
  label?: string;
}

export default function ConstancyStateVisual({
  state,
  size = RING_SIZE,
  label,
}: ConstancyStateVisualProps) {
  const color = STATE_COLORS[state];
  const fill = STATE_FILL[state];
  const displayLabel = label ?? STATE_LABELS[state];

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
    strokeDashoffset: CIRCUMFERENCE * (1 - fill * ringProgress.value),
  }));

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, animatedWrapperStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={STROKE_WIDTH}
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          animatedProps={animatedRingProps}
        />
      </Svg>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
          <Flame size={28} color={color} strokeWidth={2.5} />
        </View>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {displayLabel}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
