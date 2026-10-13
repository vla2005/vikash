import { pointerEventsStyles } from '../theme/interaction';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Icon from './Icon';
import useVoiceReviewProgress from '../hooks/useVoiceReviewProgress';
import { useThemeTokens } from '../contexts/ThemeContext';

export default memo(function VoiceMicGlyph({ review }) {
  const { voiceOrb } = useThemeTokens();
  const progress = useVoiceReviewProgress(
    review,
    voiceOrb.control.iconDuration,
  );
  const microphone = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [
      { rotate: `${-35 * progress.get()}deg` },
      { scale: 1 - progress.get() * 0.25 },
    ],
  }));
  const check = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { rotate: `${35 * (1 - progress.get())}deg` },
      { scale: 0.75 + progress.get() * 0.25 },
    ],
  }));
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, pointerEventsStyles.none]}
    >
      <Animated.View style={[styles.icon, microphone]}>
        <Icon name="microphone" size={30} color={voiceOrb.control.icon} />
      </Animated.View>
      <Animated.View style={[styles.icon, check]}>
        <Icon name="check" size={30} color={voiceOrb.control.icon} />
      </Animated.View>
    </View>
  );
});
const styles = StyleSheet.create({
  frame: { width: 30, height: 30 },
  icon: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
