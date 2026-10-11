import { useTheme } from '../contexts/ThemeContext';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import CategoryIcon from './CategoryIcon';

export default function CategoryBadge({ category, size = 38, iconSize = 28, vivid = false }) {
  const { categoryColors } = useTheme();
  const palette = categoryColors.find(color => color.key === category.color)
    || categoryColors.find(color => color.key === 'gray');
  return <View style={[styles.badge, {
    width: size, height: size, borderRadius: size * 0.26, backgroundColor: vivid ? palette.accent : palette.background,
  }]}>
    <CategoryIcon name={category.icon} size={iconSize} color={vivid ? palette.onAccent : palette.foreground} solid />
  </View>;
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
