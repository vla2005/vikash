import { pointerEventsStyles } from '../theme/interaction';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';
import { useThemeTokens } from '../contexts/ThemeContext';

export default memo(function VoiceMicGlyph({ review }) {
  const { voiceOrb } = useThemeTokens();
  const reduced = useReducedMotion();
  const motion = {
    transitionDuration: reduced ? '0ms' : `${voiceOrb.control.iconDuration}ms`,
  };
  return (
    <View
      aria-hidden
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, pointerEventsStyles.none]}
    >
      <View
        style={[styles.icon, motion, review ? styles.micHidden : styles.shown]}
      >
        <Icon name="microphone" size={30} color={voiceOrb.control.icon} />
      </View>
      <View
        style={[
          styles.icon,
          motion,
          review ? styles.shown : styles.checkHidden,
        ]}
      >
        <Icon name="check" size={30} color={voiceOrb.control.icon} />
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  frame: { width: 30, height: 30 },
  icon: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'transform, opacity',
    transitionTimingFunction: 'cubic-bezier(.23,1,.32,1)',
  },
  shown: { opacity: 1, transform: [{ rotate: '0deg' }, { scale: 1 }] },
  micHidden: { opacity: 0, transform: [{ rotate: '-35deg' }, { scale: 0.75 }] },
  checkHidden: {
    opacity: 0,
    transform: [{ rotate: '35deg' }, { scale: 0.75 }],
  },
});
