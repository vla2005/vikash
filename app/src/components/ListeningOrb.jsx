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
import ListeningOrbSurface from './ListeningOrbSurface';
import { voiceOrb } from '../theme/silver';
import { createOrbMesh, projectOrb } from '../utils/listeningOrb';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const mesh = createOrbMesh();
const initialShape = projectOrb(mesh, 0, voiceOrb.radius, voiceOrb.deformation);

const ListeningOrb = memo(function ListeningOrb({
  active,
  size = voiceOrb.size,
}) {
  const phase = useSharedValue(0);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background',
  );
  const running = active && foreground;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    cancelAnimation(phase);
    phase.set(0);
    if (running) {
      // A escuta permanece animada com Reduzir movimento, conforme solicitado.
      phase.set(
        withRepeat(
          withTiming(Math.PI * 2, {
            duration: voiceOrb.duration,
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
  // Um cálculo compartilhado e dois paths, sem render React por frame.
  const shape = useDerivedValue(
    () => projectOrb(mesh, phase.get(), voiceOrb.radius, voiceOrb.deformation),
    [phase],
  );
  const front = useAnimatedProps(() => ({ d: shape.get().front }), [shape]);
  const back = useAnimatedProps(() => ({ d: shape.get().back }), [shape]);
  return (
    <ListeningOrbSurface
      active={active}
      size={size}
      PathComponent={AnimatedPath}
      frontProps={{ d: initialShape.front, animatedProps: front }}
      backProps={{ d: initialShape.back, animatedProps: back }}
    />
  );
});
export default ListeningOrb;
