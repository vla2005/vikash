import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { DrawerMotionContext } from './DrawerModal';
import { useThemeStyles } from '../contexts/ThemeContext';

// The backdrop stays stationary while the panel enters or leaves.
export default function DrawerPanel({
  style,
  children,
  onLayout,
  fullScreen = false,
  ...props
}) {
  const motion = useContext(DrawerMotionContext);
  const slide = motion?.slide;
  const styles = useThemeStyles(createStyles);
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: slide?.get() ?? 0 }],
    }),
    [slide],
  );
  return (
    <Animated.View
      accessibilityViewIsModal
      {...props}
      onLayout={event => {
        motion?.measure(event);
        onLayout?.(event);
      }}
      style={[
        style,
        fullScreen ? styles.fullScreen : styles.panel,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    panel: { backgroundColor: colors.dialogSurface },
    fullScreen: { backgroundColor: colors.background },
  });
