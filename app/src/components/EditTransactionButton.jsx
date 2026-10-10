import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors } from '../theme';

export default function EditTransactionButton({ onPress, purchase = false }) {
  const label = purchase ? 'Editar compra' : 'Editar transação';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.button, pressed && s.pressed]}>
    <Icon name="edit" size={24} color={colors.text} />
  </Pressable>;
}
const s = StyleSheet.create({
  button: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
