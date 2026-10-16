import { pointerEventsStyles } from '../theme/interaction';
import { useThemeStyles } from '../contexts/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import { fontFamilyBold, fontFamilyMedium } from '../theme';

export default function SegmentedControl({ options, value, onChange, style }) {
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const index = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );
  const itemWidth = Math.max(0, width - 8) / options.length;

  useEffect(() => {
    if (reduced) {
      position.setValue(index * itemWidth);
      return;
    }
    const movement = Animated.spring(position, {
      toValue: index * itemWidth,
      damping: 22,
      stiffness: 280,
      mass: 0.75,
      useNativeDriver: Platform.OS !== 'web',
    });
    movement.start();
    return () => movement.stop();
  }, [index, itemWidth, reduced, position]);

  return (
    <View
      style={[styles.track, style]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {!!width && (
        <Animated.View
          style={[
            [
              styles.indicator,
              { width: itemWidth, transform: [{ translateX: position }] },
            ],
            pointerEventsStyles.none,
          ]}
        />
      )}
      {options.map(option => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityLabel={option.accessibilityLabel || option.label}
          accessibilityState={{ selected: value === option.value }}
          aria-selected={value === option.value}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
        >
          <Text
            numberOfLines={1}
            style={[styles.label, value === option.value && styles.selected]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 999,
      padding: 4,
      minHeight: 44,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    indicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: 999,
      backgroundColor: colors.brandPrimary,
      borderWidth: 1,
      borderColor: colors.accent || colors.brandPrimary,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      minHeight: 36,
    },
    label: {
      fontFamily: fontFamilyMedium,
      fontSize: 13,
      color: colors.secondary,
      fontWeight: '500',
    },
    selected: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      color: colors.onBrand,
    },
    pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  });
