import React, { useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import useReducedMotion from '../hooks/useReducedMotion';
import ToastContent from './ToastContent';

export { toastVariants } from './ToastContent';

export default function Toast(props) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(reduced ? 0 : -6);
  useEffect(() => {
    offset.set(
      reduced
        ? 0
        : withTiming(0, {
            duration: 180,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
            reduceMotion: ReduceMotion.Never,
          }),
    );
  }, [reduced, offset]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));
  return <ToastContent {...props} Box={Animated.View} style={style} />;
}
