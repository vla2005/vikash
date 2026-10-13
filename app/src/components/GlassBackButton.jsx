import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import GlassMaterial from './silver/GlassMaterial';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassBackButton({
  onPress,
  accessibilityLabel = 'Voltar',
  disabled = false,
  style,
}) {
  const { colors } = useTheme();
  return (
    <GlassMaterial blurred={false} style={[s.shell, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [s.button, (pressed || disabled) && s.dimmed]}
      >
        <View style={s.arrow}>
          <Icon name="arrow" size={20} color={colors.text} />
        </View>
      </Pressable>
    </GlassMaterial>
  );
}

const s = StyleSheet.create({
  shell: { width: 44, height: 44, borderRadius: 22 },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arrow: { transform: [{ rotate: '180deg' }] },
  dimmed: { opacity: 0.55 },
});
