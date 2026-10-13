import { pointerEventsStyles } from '../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';
import { voiceOrb } from '../theme/silver';

export default function VoiceScene({
  review,
  distance,
  visualOffset,
  visual,
  children,
  onLayout,
}) {
  const reduced = useReducedMotion();
  const duration = reduced ? '0ms' : `${voiceOrb.transition.duration}ms`;
  return (
    <View style={styles.scene} onLayout={onLayout} testID="voice-scene">
      <View
        aria-hidden={review}
        accessibilityElementsHidden={review}
        importantForAccessibility={review ? 'no-hide-descendants' : 'auto'}
        style={[[
          styles.layer,
          styles.visual,
          styles.motion,
          review && styles.hidden,
          {
            transitionDuration: duration,
            transform: [
              { translateY: visualOffset - (review ? 24 : 0) },
              { scale: review ? 0.88 : 1 },
            ],
          },
        ], pointerEventsStyles.none]}
      >
        {visual}
      </View>
      <View
        style={[
          styles.layer,
          styles.motion,
          {
            transitionDuration: duration,
            transform: [{ translateY: review ? 0 : distance }],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden' },
  layer: { ...StyleSheet.absoluteFillObject },
  visual: { alignItems: 'center', justifyContent: 'center', opacity: 1 },
  hidden: { opacity: 0 },
  motion: {
    transitionProperty: 'transform, opacity',
    transitionTimingFunction: 'cubic-bezier(.23,1,.32,1)',
  },
});
