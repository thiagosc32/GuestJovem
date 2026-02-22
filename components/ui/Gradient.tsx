import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function Gradient({ 
  colors, 
  start = { x: 0, y: 0 }, 
  end = { x: 0, y: 1 }, 
  style, 
  children 
}: GradientProps) {
  
  // Mobile (iOS/Android): Use expo-linear-gradient
  if (Platform.OS !== 'web') {
    return (
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={[styles.container, style]}
      >
        {children}
      </LinearGradient>
    );
  }
  
  // Web: Use CSS linear-gradient
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  
  const webGradientStyle = {
    background: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
  };

  return (
    <View style={[styles.container, webGradientStyle as any, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});