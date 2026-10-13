import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeStyles } from '../../contexts/ThemeContext';

export default memo(function DockShade({ bottomInset }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View
      aria-hidden
      style={[[styles.shade, { bottom: -bottomInset }], pointerEventsStyles.none]}
    />
  );
});

const createStyles = (_colors, _type, { dock }) =>
  StyleSheet.create({
    shade: {
      position: 'absolute',
      top: -dock.shade.overhang,
      left: -dock.margin,
      right: -dock.margin,
      backgroundImage: `linear-gradient(to bottom, transparent 0%, ${
        dock.shade.color
      }14 35%, ${dock.shade.color}A8 70%, ${dock.shade.color}${Math.round(
        dock.shade.opacity * 255,
      )
        .toString(16)
        .padStart(2, '0')} 100%)`,
    },
  });
