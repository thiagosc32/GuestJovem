/**
 * Na web, envolve o conteúdo do app em um container com largura máxima e centralizado,
 * para que o layout não estique demais em telas grandes (responsivo).
 * No mobile (iOS/Android) apenas repassa os children.
 */

import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useResponsiveWeb } from '../hooks/useResponsiveWeb';

export default function WebLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isWeb, contentMaxWidth } = useResponsiveWeb();

  if (Platform.OS !== 'web' || !isWeb) {
    return <View style={styles.flex}>{children}</View>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={[styles.webInner, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  webOuter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? '#FAFAFA' : undefined,
  },
  webInner: {
    flex: 1,
    width: '100%',
  },
});