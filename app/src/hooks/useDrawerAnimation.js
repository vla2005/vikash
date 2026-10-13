import { useCallback } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export default function useDrawerAnimation(initialOffset) {
  const slide = useSharedValue(initialOffset);
  const stop = useCallback(() => cancelAnimation(slide), [slide]);
  const prepare = useCallback(
    offset => {
      cancelAnimation(slide);
      slide.set(offset);
    },
    [slide],
  );
  const enter = useCallback(() => {
    slide.set(
      withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [slide]);
  const exit = useCallback(
    (offset, complete) => {
      slide.set(
        withTiming(
          offset,
          {
            duration: 260,
            // Equivale ao t³ da saída anterior.
            easing: Easing.bezier(1 / 3, 0, 2 / 3, 0),
            reduceMotion: ReduceMotion.Never,
          },
          finished => {
            if (finished) {
              scheduleOnRN(complete);
            }
          },
        ),
      );
    },
    [slide],
  );
  return { slide, enter, exit, prepare, stop };
}
