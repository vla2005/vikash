import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { fontFamilyMedium } from '../theme';

export default function PrimaryButton({ title, onPress, loading = false, disabled = false, outlined = false, icon = 'arrow', style }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const unavailable = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable} onPress={onPress} style={({ pressed }) => [styles.button, outlined && styles.outlined, unavailable && styles.disabled, pressed && styles.pressed, style]}>
      <Text style={[styles.text, outlined && styles.outlinedText]}>{loading ? 'Aguarde...' : title}</Text>
      {!loading && icon && <Icon name={icon} color={outlined ? colors.primary : colors.onBrand} size={24} />}
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  button: { minHeight: 54, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 15, backgroundColor: colors.brandPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  outlined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, justifyContent: 'center' },
  text: { color: colors.onBrand, fontFamily: fontFamilyMedium, fontSize: 17, fontWeight: '600' },
  outlinedText: { color: colors.primary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
