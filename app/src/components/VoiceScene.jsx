import { pointerEventsStyles } from '../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import useVoiceReviewProgress from '../hooks/useVoiceReviewProgress';
import { voiceOrb } from '../theme/silver';

export default function VoiceScene({
  review,
  distance,
  visualOffset,
  visual,
  children,
  onLayout,
}) {
  const progress = useVoiceReviewProgress(review, voiceOrb.transition.duration);
  const illustration = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [
      { translateY: visualOffset - progress.get() * 24 },
      { scale: 1 - progress.get() * 0.12 },
    ],
  }));
  const transcript = useAnimatedStyle(() => ({
    transform: [{ translateY: distance * (1 - progress.get()) }],
  }));
  return (
    <View style={styles.scene} onLayout={onLayout} testID="voice-scene">
      <Animated.View
        accessibilityElementsHidden={review}
        importantForAccessibility={review ? 'no-hide-descendants' : 'auto'}
        style={[[styles.layer, styles.visual, illustration], pointerEventsStyles.none]}
      >
        {visual}
      </Animated.View>
      <Animated.View style={[styles.layer, transcript]}>
        {children}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  scene: { flex: 1, minHeight: 0, overflow: 'hidden' },
  layer: { ...StyleSheet.absoluteFill },
  visual: { alignItems: 'center', justifyContent: 'center' },
});
