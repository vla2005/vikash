import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, G, Path } from 'react-native-svg';

const MotionCircle = Animated.createAnimatedComponent(Circle);
const MotionGroup = Animated.createAnimatedComponent(G);
const MotionPath = Animated.createAnimatedComponent(Path);

// A web conserva o renderer e as curvas anteriores; não importa a ponte nativa.
export function useChartProgress(active, resetKey, curve = 'outCubic') {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.setValue(active ? 0 : 1);
    if (!active) { return; }
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 900,
      easing: curve === 'inOutQuad' ? Easing.inOut(Easing.quad) : Easing.out(Easing.cubic),
      useNativeDriver: false, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, resetKey, curve, progress]);
  return progress;
}

export function ChartDrawCircle({ progress, length, ...props }) {
  return <MotionCircle {...props} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })} />;
}

export function ChartDrawPath({ progress, length, ...props }) {
  return <MotionPath {...props} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })} />;
}

export function ChartFadeGroup({ progress, late = false, ...props }) {
  const opacity = late ? progress.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }) : progress;
  return <MotionGroup {...props} opacity={opacity} />;
}
