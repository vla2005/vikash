import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

export const MotionBox = Animated.View;
export const MotionScroller = Animated.ScrollView;

// Web has no native Worklets runtime. Animated updates styles without React renders.
export function useCardStackMotion(initialY, maxScroll) {
  const scrollY = useRef(new Animated.Value(initialY)).current;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      }),
    [scrollY],
  );
  const topStyle = {
    opacity:
      maxScroll > 0
        ? scrollY.interpolate({
            inputRange: [0, 16],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : 0,
  };
  const bottomStyle = {
    opacity:
      maxScroll > 0
        ? scrollY.interpolate({
            inputRange: [Math.max(0, maxScroll - 16), maxScroll],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          })
        : 0,
  };
  const reset = useCallback(y => scrollY.setValue(y), [scrollY]);
  const stop = useCallback(() => scrollY.stopAnimation(), [scrollY]);
  return { scrollY, onScroll, topStyle, bottomStyle, reset, stop };
}

export function MotionCard({ scrollY, index, selected, step, style, children }) {
  const previousIndex = useRef(index);
  const offset = useRef(new Animated.Value(0)).current;
  const emphasis = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useLayoutEffect(() => {
    const delta = (previousIndex.current - index) * step;
    previousIndex.current = index;
    offset.stopAnimation(value => offset.setValue(value + delta));
    const animation = Animated.parallel([
      Animated.timing(offset, { toValue: 0, duration: 360, useNativeDriver: false }),
      Animated.timing(emphasis, { toValue: selected ? 1 : 0, duration: 360, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [index, selected, step, offset, emphasis]);
  const depthScale = scrollY.interpolate({
    inputRange: [index * step, (index + 2) * step],
    outputRange: [0.955, 0.91],
    extrapolate: 'clamp',
  });
  const scale = Animated.add(depthScale, Animated.multiply(
    Animated.subtract(1, depthScale), emphasis,
  ));
  return (
    <Animated.View style={[style, {
      opacity: emphasis.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }),
      transform: [{ translateY: offset }, { scale }],
    }]}>
      {children}
    </Animated.View>
  );
}