import React from 'react';
import { View, TouchableWithoutFeedback, Keyboard, Platform, StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Envolve formulários que no mobile fecham o teclado ao tocar fora.
 * Na web, TouchableWithoutFeedback pode roubar o foco e impedir TextInput de abrir o teclado.
 */
export default function DismissKeyboardView({ children, style }: Props) {
  if (Platform.OS === 'web') {
    return <View style={style}>{children}</View>;
  }
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
