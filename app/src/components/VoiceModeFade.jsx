import React, { useEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { voiceOrb } from '../theme/silver';
import { pointerEventsStyles } from '../theme/interaction';
export default function VoiceModeFade({
  visible,
  minOpacity = 0,
  interactive = false,
  style,
  children,
}) {
  const progress = useSharedValue(visible ? 1 : 0);
  const previous = useRef(visible);
  useEffect(() => {
    if (previous.current === visible) {
      return undefined;
    }
    previous.current = visible;
    progress.set(
      withTiming(visible ? 1 : 0, {
        duration: voiceOrb.composer.duration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        reduceMotion: ReduceMotion.Never,
      }),
    );
    return () => cancelAnimation(progress);
  }, [visible, progress]);
  const motion = useAnimatedStyle(() => ({
    opacity: minOpacity + (1 - minOpacity) * progress.get(),
  }));
  const hidden = !visible && minOpacity === 0;
  return (
    <Animated.View
      accessibilityElementsHidden={hidden}
      aria-hidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[
        style,
        motion,
        pointerEventsStyles[visible && interactive ? 'auto' : 'none'],
      ]}
    >
      {children}
    </Animated.View>
  );
}
