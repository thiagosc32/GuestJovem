/**
 * Avatar da ovelha em Lottie para a Vida Espiritual (Jornada).
 * Exibe a ovelha em movimento (bounce). Fallback: avatar animado em SVG quando Lottie não está disponível (ex.: web).
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { CompanionStateKey } from '../constants/spiritualCompanion';
import AnimatedCompanionAvatar from './AnimatedCompanionAvatar';

export interface SheepLottieAvatarProps {
  size?: number;
  color: string;
  opacity?: number;
  state?: CompanionStateKey;
}

let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch {
  // lottie-react-native não disponível (ex.: web)
}

const sheepLottieSource = require('../assets/lottie/sheep-bounce.json');

export default function SheepLottieAvatar({
  size = 140,
  color,
  opacity = 1,
  state,
}: SheepLottieAvatarProps) {
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (LottieView && lottieRef.current) {
      lottieRef.current.play();
    }
  }, []);

  if (!LottieView) {
    return <AnimatedCompanionAvatar size={size} color={color} opacity={opacity} state={state} />;
  }

  const height = size;
  const nudgeX = size * 0.04;
  const nudgeY = size * 0.06;

  return (
    <View style={[styles.wrap, { width: size, height, opacity }]}>
      <LottieView
        ref={lottieRef}
        source={sheepLottieSource}
        autoPlay
        loop
        style={[
          styles.lottie,
          {
            width: size,
            height,
            transform: [{ translateX: -nudgeX }, { translateY: -nudgeY }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    ...(Platform.OS === 'web' && { pointerEvents: 'none' as const }),
  },
});
