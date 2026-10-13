import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import useReducedMotion from '../../hooks/useReducedMotion';
import { DockContext } from '../../contexts/DockContext';

export default function DockProvider({
  sceneKey,
  bottomInset = 0,
  headerHeight = 0,
  children,
}) {
  const target = useSharedValue(0);
  const progress = useSharedValue(0);
  const blurTarget = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    target.set(0);
  }, [sceneKey, target]);
  useAnimatedReaction(
    () => target.get(),
    (next, previous) => {
      if (next === previous) {
        return;
      }
      progress.set(
        withTiming(next, {
          duration: reduced ? 0 : 260,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          reduceMotion: ReduceMotion.Never,
        }),
      );
      scheduleOnRN(setCollapsed, !!next);
    },
    [reduced],
  );
  const value = useMemo(
    () => ({
      target,
      progress,
      collapsed,
      blurTarget,
      bottomInset,
      headerHeight,
      expand: () => target.set(0),
    }),
    [target, progress, collapsed, bottomInset, headerHeight],
  );
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}
