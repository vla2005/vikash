import React, { useEffect, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation, ReduceMotion } from 'react-native-reanimated';
export default function AssistantMotion({ children, style, chat }) {
  const progress = useSharedValue(1);
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) { initial.current=false; return; }
    progress.set(0);
    progress.set(withTiming(1, { duration: chat ? 300 : 460, reduceMotion: ReduceMotion.Never }));
    return () => cancelAnimation(progress);
  }, [chat, progress]);
  const motion = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * (chat ? 12 : 34) },
      { scale: 0.97 + progress.get() * 0.03 }],
  }));
  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}
