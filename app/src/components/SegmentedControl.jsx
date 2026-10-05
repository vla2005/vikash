import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import { colors, fontFamilyMedium } from '../theme';

export default function SegmentedControl({ options, value, onChange, style }) {
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const index = Math.max(0, options.findIndex(option => option.value === value));
  const itemWidth = Math.max(0, width - 8) / options.length;
  useEffect(() => {
    if (reduced) { position.setValue(index * itemWidth); return; }
    const movement = Animated.spring(position, { toValue: index * itemWidth, damping: 24, stiffness: 250, mass: 0.8, useNativeDriver: Platform.OS !== 'web' });
    movement.start();
    return () => movement.stop();
  }, [index, itemWidth, reduced, position]);
  return <View style={[styles.track, style]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {!!width && <Animated.View pointerEvents="none" style={[styles.indicator, { width: itemWidth, transform: [{ translateX: position }] }]} />}
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.accessibilityLabel || option.label} accessibilityState={{ selected: value === option.value }} aria-selected={value === option.value}
      onPress={() => onChange(option.value)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      <Text numberOfLines={1} style={[styles.label, value === option.value && styles.selected]}>{option.label}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 4, minHeight: 44, overflow: 'hidden' },
  indicator: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, backgroundColor: colors.primary },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, minHeight: 36 },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.secondary, fontWeight: '500' },
  selected: { color: colors.surface },
  pressed: { opacity: 0.65 },
});
