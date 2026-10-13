import { pointerEventsStyles } from '../theme/interaction';
import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeTokens } from '../contexts/ThemeContext';
import VoiceMicGlow from './VoiceMicGlow';

export default memo(function VoiceMicPulse({ active }) {
  const { voiceOrb } = useThemeTokens();
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.set(0);
    if (active) {
      pulse.set(
        withRepeat(
          withTiming(1, {
            duration: voiceOrb.control.duration,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.Never,
          }),
          -1,
          false,
          undefined,
          ReduceMotion.Never,
        ),
      );
    }
    return () => cancelAnimation(pulse);
  }, [active, pulse, voiceOrb.control.duration]);
  const first = useAnimatedStyle(() => {
    const progress = pulse.get() % 1;
    return {
      opacity: Math.sin(progress * Math.PI) * 0.5,
      transform: [{ scale: 1 + progress * 0.7 }],
    };
  });
  const second = useAnimatedStyle(() => {
    const progress = (pulse.get() + 0.5) % 1;
    return {
      opacity: Math.sin(progress * Math.PI) * 0.35,
      transform: [{ scale: 1 + progress * 0.7 }],
    };
  });
  const glow = useAnimatedStyle(() => {
    const light = (Math.sin(pulse.get() * Math.PI * 2) + 1) / 2;
    return {
      opacity: 0.55 + light * 0.35,
      transform: [{ scale: 1 + light * 0.08 }],
    };
  });
  if (!active) {
    return null;
  }
  return (
    <>
      <Animated.View style={[[styles.glow, glow], pointerEventsStyles.none]}>
        <VoiceMicGlow />
      </Animated.View>
      <Animated.View
        style={[[styles.ring, { borderColor: voiceOrb.control.rim }, first], pointerEventsStyles.none]}
      />
      <Animated.View
        style={[[styles.ring, { borderColor: voiceOrb.control.rim }, second], pointerEventsStyles.none]}
      />
    </>
  );
});
const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  glow: { position: 'absolute', left: -32, top: -32, width: 136, height: 136 },
});
