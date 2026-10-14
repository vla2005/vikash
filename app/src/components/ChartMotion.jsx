import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, G, Path } from 'react-native-svg';

const MotionCircle = Animated.createAnimatedComponent(Circle);
const MotionGroup = Animated.createAnimatedComponent(G);
const MotionPath = Animated.createAnimatedComponent(Path);

// O desenho fica na UI thread; sem Animated.Value ou atualizações JS por frame.
export function useChartProgress(active, resetKey, curve = 'outCubic') {
  const progress = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(progress);
    progress.set(active ? 0 : 1);
    if (active) {
      progress.set(withTiming(1, {
        duration: 900,
        easing: curve === 'inOutQuad' ? Easing.inOut(Easing.quad) : Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      }));
    }
    return () => cancelAnimation(progress);
  }, [active, resetKey, curve, progress]);
  return progress;
}

export function ChartDrawCircle({ progress, length, ...props }) {
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - progress.get()) * length }));
  return <MotionCircle {...props} animatedProps={animatedProps} />;
}

export function ChartDrawPath({ progress, length, ...props }) {
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - progress.get()) * length }));
  return <MotionPath {...props} animatedProps={animatedProps} />;
}

export function ChartFadeGroup({ progress, late = false, ...props }) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: late ? Math.max(0, Math.min(1, (progress.get() - 0.9) * 10)) : progress.get(),
  }));
  return <MotionGroup {...props} animatedProps={animatedProps} />;
}
