import React, { forwardRef } from 'react';
import { FlatList } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useDock } from '../../contexts/DockContext';
import { nextDockScroll } from '../../utils/dockScroll';
import useDockPadding from '../../hooks/useDockPadding';

const AnimatedList = Animated.createAnimatedComponent(FlatList);

export default forwardRef(function StatementList(
  { onReachEnd, contentContainerStyle, ...props },
  ref,
) {
  const context = useDock();
  const dockPadding = useDockPadding(contentContainerStyle);
  const target = context?.target;
  const anchor = useSharedValue(0);
  const endHeight = useSharedValue(0);
  const scroll = useAnimatedScrollHandler(event => {
    const y = event.contentOffset.y;
    const max = Math.max(
      0,
      event.contentSize.height - event.layoutMeasurement.height,
    );
    if (target) {
      const currentAnchor = anchor.get();
      const currentTarget = target.get();
      const next = nextDockScroll(y, currentAnchor, !!currentTarget, max);
      if (next.anchor !== currentAnchor) {
        anchor.set(next.anchor);
      }
      const nextTarget = next.collapsed ? 1 : 0;
      if (nextTarget !== currentTarget) {
        target.set(nextTarget);
      }
    }
    // Paginação chama o JS apenas quando cruza o limiar, nunca a cada frame.
    if (
      onReachEnd &&
      y >= max - 240 &&
      endHeight.get() !== event.contentSize.height
    ) {
      endHeight.set(event.contentSize.height);
      scheduleOnRN(onReachEnd);
    } else if (y < max - 240 && endHeight.get() !== 0) {
      endHeight.set(0);
    }
  });
  return (
    <AnimatedList
      {...props}
      ref={ref}
      onScroll={scroll}
      scrollEventThrottle={16}
      contentContainerStyle={[contentContainerStyle, dockPadding]}
    />
  );
});
