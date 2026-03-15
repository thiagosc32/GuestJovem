/**
 * Botão do menu hambúrguer que abre o Drawer.
 * Usado à esquerda do avatar/conteúdo no topo das telas.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/dimensions';
import { SHADOWS } from '../../constants/theme';

const SIZE = 42;

export default function DrawerMenuButton() {
  const navigation = useNavigation();
  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <TouchableOpacity
      onPress={openDrawer}
      style={styles.button}
      activeOpacity={0.7}
      accessibilityLabel="Abrir menu"
    >
      <Menu size={22} color={COLORS.text} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
});
