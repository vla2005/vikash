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
import Skeleton, { SkeletonGroup } from '../Skeleton';
import useAppActive from '../../hooks/useAppActive';

export default memo(function AssistantThinking({ active = true }) {
  const running = useAppActive(active);
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    if (running)
      opacity.set(
        withRepeat(
          withTiming(1, {
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.Never,
          }),
          -1,
          true,
          undefined,
          ReduceMotion.Never,
        ),
      );
    else opacity.set(0.55);
    return () => cancelAnimation(opacity);
  }, [running, opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }), [opacity]);
  return (
    <SkeletonGroup label="ViKash está preparando a resposta" style={s.root}>
      <Animated.View
        testID="assistant-thinking-skeleton"
        style={[s.lines, pulse]}
      >
        <Skeleton width="92%" height={13} radius={6} style={s.line} />
        <Skeleton width="85%" height={13} radius={6} style={s.line} />
        <Skeleton width="57%" height={13} radius={6} style={s.line} />
      </Animated.View>
    </SkeletonGroup>
  );
});
const s = StyleSheet.create({
  root: { width: '100%', paddingTop: 6, paddingBottom: 30 },
  lines: { gap: 14 },
  line: { backgroundColor: '#303035' },
});
