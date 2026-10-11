import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { colors, fontFamilyMedium } from '../theme';

export default function DeleteActionButton({ label, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, pressed && s.pressed, disabled && s.disabled]}>
    <Icon name="trash" size={20} color={colors.error} /><Text style={s.text}>{label}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.errorSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  text: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.error },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
});
