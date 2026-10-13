import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import logo from '../assets/brand';
import { useTheme } from '../contexts/ThemeContext';

export default function BrandLogo({ centered = false, width = 188 }) {
  const { scheme, colors, variant } = useTheme();
  const ratio = width / 188;
  return (
    <View style={[styles.frame, { width, height: 54 * ratio }, centered && styles.centered]} accessibilityRole="image" accessibilityLabel="Vikash">
      <Image source={logo} style={[styles.image, { width: 260 * ratio, height: 87 * ratio, left: -40 * ratio, top: -17 * ratio }]} tintColor={scheme === 'dark' || variant === 'silver' ? colors.text : undefined} resizeMode="contain" />
      {scheme === 'dark' && variant !== 'silver' && <View accessible={false} style={[styles.mark, { width: 59 * ratio, height: 54 * ratio }]}>
        <Image source={logo} style={[styles.image, { width: 260 * ratio, height: 87 * ratio, left: -40 * ratio, top: -17 * ratio }]} resizeMode="contain" />
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 188, height: 54, overflow: 'hidden' },
  centered: { alignSelf: 'center' },
  mark: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  image: { position: 'absolute', width: 260, height: 87, left: -40, top: -17 },
});
