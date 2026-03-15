/**
 * Barra de constância (Vida Espiritual) — mesma lógica do anel, em formato horizontal.
 * Verde (strong) → amarelo (weakening) → laranja (weak) → vermelho (bones), com animação.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import type { CompanionStateKey } from '../constants/spiritualCompanion';

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

const BAR_HEIGHT = 10;

export interface ConstancyBarProps {
  state: CompanionStateKey;
  width?: number;
  showLabel?: boolean;
}

export default function ConstancyBar({
  state,
  width = 120,
  showLabel = false,
}: ConstancyBarProps) {
  const color = STATE_COLORS[state];
  const fill = STATE_FILL[state];

  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [state]);

  const fillStyle = useAnimatedStyle(() => ({
    width: width * fill * progress.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pulse.value }],
  }));

  return (
    <View style={[styles.wrap, { width }]}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Flame size={12} color={color} />
          <Text style={[styles.label, { color }]} numberOfLines={1}>
            Constância
          </Text>
        </View>
      )}
      <View style={[styles.track, { width }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color },
            fillStyle,
            pulseStyle,
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.stateLabel} numberOfLines={1}>
          {STATE_LABELS[state]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  stateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
});
