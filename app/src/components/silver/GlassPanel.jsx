import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import GlassReflection from './GlassReflection';
import { useThemeStyles } from '../../contexts/ThemeContext';

// A luz já é difusa: a película translúcida dispensa blur por card durante a rolagem.
export default function GlassPanel({ children, style, ...props }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View {...props} style={[styles.panel, style]}>
      <GlassReflection />
      <View accessible={false} style={[styles.reflection, pointerEventsStyles.none]} />
      {children}
    </View>
  );
}
const createStyles = (_colors, _type, { glass }) =>
  StyleSheet.create({
    panel: {
      backgroundColor: glass.fill,
      borderRadius: glass.radius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.rim,
      overflow: 'hidden',
      boxShadow: glass.shadow,
    },
    reflection: {
      position: 'absolute',
      top: 0,
      left: 16,
      right: 16,
      height: StyleSheet.hairlineWidth,
      backgroundColor: glass.highlight,
    },
  });
