import { pointerEventsStyles } from '../theme/interaction';
/* eslint-env browser */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { voiceOrb as defaultVoiceOrb } from '../theme/silver';
import { useThemeTokens } from '../contexts/ThemeContext';
import VoiceMicGlow from './VoiceMicGlow';

export default memo(function VoiceMicPulse({ active }) {
  const { voiceOrb } = useThemeTokens();
  if (!active) {
    return null;
  }
  return (
    <>
      <View style={[[styles.glow, styles.glowMotion], pointerEventsStyles.none]}>
        <VoiceMicGlow />
      </View>
      <View
        style={[[
          styles.ring,
          { borderColor: voiceOrb.control.rim },
          styles.motion,
        ], pointerEventsStyles.none]}
      />
      <View
        style={[[
          styles.ring,
          { borderColor: voiceOrb.control.rim },
          styles.motion,
          styles.delayed,
        ], pointerEventsStyles.none]}
      />
    </>
  );
});
const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  glow: { position: 'absolute', left: -32, top: -32, width: 136, height: 136 },
  glowMotion: {
    animationKeyframes: {
      '0%': { opacity: 0.55, transform: [{ scale: 1 }] },
      '50%': { opacity: 0.9, transform: [{ scale: 1.08 }] },
      '100%': { opacity: 0.55, transform: [{ scale: 1 }] },
    },
    animationDuration: `${defaultVoiceOrb.control.duration}ms`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  motion: {
    animationKeyframes: {
      '0%': { opacity: 0, transform: [{ scale: 1 }] },
      '50%': { opacity: 0.5, transform: [{ scale: 1.35 }] },
      '100%': { opacity: 0, transform: [{ scale: 1.7 }] },
    },
    animationDuration: `${defaultVoiceOrb.control.duration}ms`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  delayed: { animationDelay: `-${defaultVoiceOrb.control.duration / 2}ms` },
});
