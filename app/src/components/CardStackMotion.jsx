import React, { useCallback, useLayoutEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';

export const MotionBox = Animated.View;
export const MotionScroller = Animated.ScrollView;

export function useCardStackMotion(initialY, maxScroll) {
  const scrollY = useSharedValue(initialY);
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.set(event.contentOffset.y);
  });
  const topStyle = useAnimatedStyle(() => ({
    opacity: maxScroll > 0 ? Math.max(0, Math.min(1, scrollY.get() / 16)) : 0,
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    opacity:
      maxScroll > 0
        ? Math.max(0, Math.min(1, (maxScroll - scrollY.get()) / 16))
        : 0,
  }));
  const reset = useCallback(y => scrollY.set(y), [scrollY]);
  const stop = useCallback(() => cancelAnimation(scrollY), [scrollY]);
  return { scrollY, onScroll, topStyle, bottomStyle, reset, stop };
}

export function MotionCard({ scrollY, index, selected, step, style, children }) {
  const previousIndex = useRef(index);
  const offset = useSharedValue(0);
  const emphasis = useSharedValue(selected ? 1 : 0);
  useLayoutEffect(() => {
    const timing = { duration: 360, reduceMotion: ReduceMotion.Never };
    offset.set(offset.get() + (previousIndex.current - index) * step);
    previousIndex.current = index;
    offset.set(withTiming(0, timing));
    emphasis.set(withTiming(selected ? 1 : 0, timing));
  }, [index, selected, step, offset, emphasis]);
  useLayoutEffect(() => () => {
    cancelAnimation(offset);
    cancelAnimation(emphasis);
  }, [offset, emphasis]);
  const motion = useAnimatedStyle(() => {
    const depthScale = Math.max(0.91,
      0.955 - (Math.max(0, scrollY.get() - index * step) / step) * 0.0225);
    return {
      opacity: 0.76 + emphasis.get() * 0.24,
      transform: [
        { translateY: offset.get() },
        { scale: depthScale + (1 - depthScale) * emphasis.get() },
      ],
    };
  });
  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}