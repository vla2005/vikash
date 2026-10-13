import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import useReducedMotion from './useReducedMotion';

// Mantém o progresso atual ao inverter uma transição em andamento.
export default function useVoiceReviewProgress(review, duration) {
  const progress = useSharedValue(review ? 1 : 0);
  const reduced = useReducedMotion();
  useEffect(() => {
    progress.set(
      withTiming(review ? 1 : 0, {
        duration: reduced ? 0 : duration,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        reduceMotion: ReduceMotion.Never,
      }),
    );
    return () => cancelAnimation(progress);
  }, [review, duration, reduced, progress]);
  return progress;
}
