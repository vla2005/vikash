import React from 'react';
import { StyleSheet, View } from 'react-native';
import { renderingEffects } from '../../config/renderingEffects';
import { pointerEventsStyles } from '../../theme/interaction';
import GlassReflection from './GlassReflection';
import { useThemeStyles } from '../../contexts/ThemeContext';

// Double-Bezel Luxury Surface: sem blur por card durante a rolagem e zero overdraw no Android.
export default function GlassPanel({
  children,
  style,
  variant = 'card',
  accentColor,
  ...props
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <View
      {...props}
      style={[
        styles.panel,
        variant === 'hero' && styles.hero,
        accentColor ? { borderColor: `${accentColor}40` } : null,
        style,
      ]}
    >
      {renderingEffects.cardReflections && (
        <>
          <GlassReflection />
          <View
            accessible={false}
            style={[styles.reflection, pointerEventsStyles.none]}
          />
        </>
      )}
      {children}
    </View>
  );
}

const createStyles = (colors, _type, { glass }) =>
  StyleSheet.create({
    panel: {
      backgroundColor: glass.fill,
      borderRadius: glass.radius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.rim,
      overflow: 'hidden',
      boxShadow: renderingEffects.cardShadows ? glass.shadow : undefined,
    },
    hero: {
      backgroundColor: colors.balanceSurface || glass.fill,
      borderColor: 'rgba(245, 158, 11, 0.28)',
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
