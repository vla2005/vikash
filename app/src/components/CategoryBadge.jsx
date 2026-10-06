import React from 'react';
import { StyleSheet, View } from 'react-native';
import CategoryIcon from './CategoryIcon';
import { categoryColors } from '../data/categories';

export default function CategoryBadge({ category, size = 38, iconSize = 28 }) {
  const palette = categoryColors.find(color => color.key === category.color)
    || categoryColors.find(color => color.key === 'gray');
  return <View style={[styles.badge, {
    width: size, height: size, borderRadius: size * 0.26, backgroundColor: palette.background,
  }]}>
    <CategoryIcon name={category.icon} size={iconSize} color={palette.foreground} solid />
  </View>;
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
