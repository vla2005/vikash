import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerMotionContext } from './DrawerModal';
import { useThemeStyles } from '../contexts/ThemeContext';

export default function DrawerPanel({
  style,
  children,
  onLayout,
  fullScreen = false,
  ...props
}) {
  const motion = useContext(DrawerMotionContext);
  const styles = useThemeStyles(createStyles);
  return (
    <View
      accessibilityViewIsModal
      {...props}
      onLayout={event => {
        motion?.measure(event);
        onLayout?.(event);
      }}
      style={[
        style,
        fullScreen ? styles.fullScreen : styles.panel,
        styles.motion,
        motion?.panelStyle,
      ]}
    >
      {children}
    </View>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    panel: { backgroundColor: colors.dialogSurface },
    fullScreen: { backgroundColor: colors.background },
    motion: { transitionProperty: 'transform' },
  });
