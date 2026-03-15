/**
 * Ilustração da ovelhinha (Vida Espiritual).
 * Usa a imagem correspondente a cada estado (strong → weakening → weak → bones).
 * Fallback: SVG quando a imagem não está disponível ou falha ao carregar.
 */

import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { CompanionStateKey } from '../constants/spiritualCompanion';
import { SHEEP_IMAGE_SOURCES } from '../constants/sheepImages';

const W = 140;
const H = 120;

function lighten(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const R = Math.round(Math.min(255, r + (255 - r) * pct));
  const G = Math.round(Math.min(255, g + (255 - g) * pct));
  const B = Math.round(Math.min(255, b + (255 - b) * pct));
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = ((num >> 16) & 0xff) * (1 - pct);
  const g = ((num >> 8) & 0xff) * (1 - pct);
  const b = (num & 0xff) * (1 - pct);
  const R = Math.round(Math.max(0, r));
  const G = Math.round(Math.max(0, g));
  const B = Math.round(Math.max(0, b));
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

export interface SheepIllustrationProps {
  size?: number;
  color: string;
  opacity?: number;
  /** Estado da vida espiritual: mostra a imagem correspondente (1ª=forte, 2ª=cansada, 3ª=fraca, 4ª=perdida) */
  state?: CompanionStateKey;
}

function SheepSvg({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const colorLight = lighten(color, 0.25);
  const colorDark = darken(color, 0.15);
  const eyeColor = '#1a1109';
  const snoutColor = colorLight;
  const h = size * (H / W);

  return (
    <Svg width={size} height={h} viewBox={`0 0 ${W} ${H}`} style={{ opacity }}>
      <Defs>
        <LinearGradient id="woolGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colorLight} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colorLight} stopOpacity="1" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={W * 0.5} cy={H * 0.72} rx={W * 0.38} ry={H * 0.26} fill="url(#woolGrad)" />
      <Circle cx={W * 0.28} cy={H * 0.68} r={W * 0.16} fill={color} fillOpacity={0.92} />
      <Circle cx={W * 0.72} cy={H * 0.68} r={W * 0.16} fill={color} fillOpacity={0.92} />
      <Circle cx={W * 0.5} cy={H * 0.64} r={W * 0.18} fill={colorLight} fillOpacity={0.95} />
      <Circle cx={W * 0.38} cy={H * 0.7} r={W * 0.14} fill={colorLight} fillOpacity={0.9} />
      <Circle cx={W * 0.62} cy={H * 0.7} r={W * 0.14} fill={colorLight} fillOpacity={0.9} />
      <Ellipse cx={W * 0.5} cy={H * 0.32} rx={W * 0.22} ry={H * 0.2} fill="url(#headGrad)" />
      <Ellipse cx={W * 0.5} cy={H * 0.3} rx={W * 0.18} ry={H * 0.16} fill={colorLight} fillOpacity={0.6} />
      <Ellipse cx={W * 0.3} cy={H * 0.22} rx={W * 0.065} ry={H * 0.09} fill={colorDark} fillOpacity={0.9} />
      <Ellipse cx={W * 0.7} cy={H * 0.22} rx={W * 0.065} ry={H * 0.09} fill={colorDark} fillOpacity={0.9} />
      <Ellipse cx={W * 0.5} cy={H * 0.38} rx={W * 0.06} ry={H * 0.045} fill={snoutColor} fillOpacity={0.85} />
      <Circle cx={W * 0.4} cy={H * 0.28} r={W * 0.028} fill={eyeColor} />
      <Circle cx={W * 0.6} cy={H * 0.28} r={W * 0.028} fill={eyeColor} />
      <Circle cx={W * 0.395} cy={H * 0.272} r={W * 0.008} fill="#fff" fillOpacity={0.9} />
      <Circle cx={W * 0.595} cy={H * 0.272} r={W * 0.008} fill="#fff" fillOpacity={0.9} />
      <Path
        d={`M ${W * 0.42} ${H * 0.34} Q ${W * 0.5} ${H * 0.38} ${W * 0.58} ${H * 0.34}`}
        stroke={colorDark}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.7}
      />
    </Svg>
  );
}

export default function SheepIllustration({ size = 80, color, opacity = 1, state }: SheepIllustrationProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const useImage = state != null && !imageFailed;
  const h = size * (H / W);

  if (useImage && SHEEP_IMAGE_SOURCES[state]) {
    return (
      <View style={{ width: size, height: size, opacity }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          <Image
            source={SHEEP_IMAGE_SOURCES[state]}
            style={{ width: size, height: size }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: h }}>
      <SheepSvg size={size} color={color} opacity={opacity} />
    </View>
  );
}
