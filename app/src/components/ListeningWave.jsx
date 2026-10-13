import React, { memo, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import ListeningWaveSurface from './ListeningWaveSurface';
import { voiceOrb } from '../theme/silver';
import { projectListeningWave } from '../utils/listeningWave';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const initialShape = projectListeningWave(0);
export default memo(function ListeningWave({ active, compact }) {
  const phase = useSharedValue(0);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background',
  );
  const running = active && foreground;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    cancelAnimation(phase);
    phase.set(0);
    if (running) {
      phase.set(
        withRepeat(
          withTiming(Math.PI * 2, {
            duration: voiceOrb.wave.duration,
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
    return () => cancelAnimation(phase);
  }, [phase, running]);
  const shape = useDerivedValue(
    () => projectListeningWave(phase.get()),
    [phase],
  );
  const strands = useAnimatedProps(() => ({ d: shape.get().strands }), [shape]);
  const ribs = useAnimatedProps(() => ({ d: shape.get().ribs }), [shape]);
  return (
    <ListeningWaveSurface
      active={active}
      compact={compact}
      PathComponent={AnimatedPath}
      strandsProps={{ d: initialShape.strands, animatedProps: strands }}
      ribsProps={{ d: initialShape.ribs, animatedProps: ribs }}
    />
  );
});
