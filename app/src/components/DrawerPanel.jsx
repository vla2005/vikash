import React, { useContext } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
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
  const android = Platform.OS === 'android';
  // O valor derivado só notifica as props nativas quando o booleano muda.
  const cacheEnabled = useDerivedValue(
    () => android && !fullScreen && !!slide && slide.get() !== 0,
    [android, fullScreen, slide],
  );
  const layerProps = useAnimatedProps(() => ({
    // Cache só do painel comum em movimento; liberar ao abrir e excluir a esfera.
    renderToHardwareTextureAndroid: cacheEnabled.get(),
  }), [cacheEnabled]);
  return (
    <Animated.View
      accessibilityViewIsModal
      {...props}
      animatedProps={layerProps}
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
