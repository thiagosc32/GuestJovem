/**
 * Avatar de corpo inteiro animado para a Vida Espiritual (Jornada).
 * Substitui a ovelha estática por uma figura que se movimenta suavemente.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import type { CompanionStateKey } from '../constants/spiritualCompanion';

const AVATAR_W = 120;
const AVATAR_H = 200;

export interface AnimatedCompanionAvatarProps {
  size?: number;
  color: string;
  opacity?: number;
  state?: CompanionStateKey;
}

function AvatarSvg({
  width,
  height,
  color,
  opacity,
}: {
  width: number;
  height: number;
  color: string;
  opacity: number;
}) {
  const dark = opacityColor(color, 0.85);
  const light = opacityColor(color, 1.15);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${AVATAR_W} ${AVATAR_H}`} style={{ opacity }}>
      {/* Cabeça */}
      <Circle cx={60} cy={32} r={22} fill={light} />
      <Circle cx={60} cy={32} r={18} fill={color} />
      {/* Olhos */}
      <Circle cx={54} cy={28} r={3} fill="#1a1a1a" />
      <Circle cx={66} cy={28} r={3} fill="#1a1a1a" />
      <Circle cx={55} cy={27} r={1} fill="#fff" fillOpacity={0.9} />
      <Circle cx={67} cy={27} r={1} fill="#fff" fillOpacity={0.9} />
      {/* Sorriso suave */}
      <Path
        d="M 52 36 Q 60 42 68 36"
        stroke={dark}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.8}
      />
      {/* Torso / corpo */}
      <Ellipse cx={60} cy={95} rx={28} ry={38} fill={light} />
      <Ellipse cx={60} cy={92} rx={24} ry={34} fill={color} />
      {/* Braço esquerdo */}
      <Ellipse cx={32} cy={88} rx={10} ry={18} fill={color} transform="rotate(-25 32 88)" />
      <Ellipse cx={30} cy={85} rx={8} ry={14} fill={light} transform="rotate(-25 30 85)" />
      {/* Braço direito */}
      <Ellipse cx={88} cy={88} rx={10} ry={18} fill={color} transform="rotate(25 88 88)" />
      <Ellipse cx={90} cy={85} rx={8} ry={14} fill={light} transform="rotate(25 90 85)" />
      {/* Perna esquerda */}
      <Path d="M 48 128 L 44 188 L 52 188 L 56 128 Z" fill={color} />
      <Path d="M 48 128 L 44 188 L 52 188 L 56 128 Z" fill={light} fillOpacity={0.6} />
      {/* Perna direita */}
      <Path d="M 72 128 L 68 188 L 76 188 L 80 128 Z" fill={color} />
      <Path d="M 72 128 L 68 188 L 76 188 L 80 128 Z" fill={light} fillOpacity={0.6} />
    </Svg>
  );
}

function opacityColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (factor > 1) {
    r = Math.round(Math.min(255, r * factor));
    g = Math.round(Math.min(255, g * factor));
    b = Math.round(Math.min(255, b * factor));
  } else {
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function AnimatedCompanionAvatar({
  size = 140,
  color,
  opacity = 1,
  state,
}: AnimatedCompanionAvatarProps) {
  const bounce = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    sway.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [bounce, sway]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = 4 * Math.sin(bounce.value * Math.PI);
    const translateX = 2 * Math.sin(sway.value * Math.PI);
    return {
      transform: [
        { translateY },
        { translateX },
      ],
    };
  });

  const height = size * (AVATAR_H / AVATAR_W);

  return (
    <Animated.View style={[{ width: size, height, alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
      <AvatarSvg width={size} height={height} color={color} opacity={opacity} />
    </Animated.View>
  );
}
