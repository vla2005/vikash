import React, { forwardRef, useRef } from 'react';
import { FlatList } from 'react-native';
import { useDock } from '../../contexts/DockContext';
import { nextDockScroll } from '../../utils/dockScroll';
import useDockPadding from '../../hooks/useDockPadding';

export default forwardRef(function StatementList(
  { onReachEnd, contentContainerStyle, ...props },
  ref,
) {
  const context = useDock();
  const dockPadding = useDockPadding(contentContainerStyle);
  const anchor = useRef(0);
  const endHeight = useRef(0);
  function scroll({ nativeEvent: event }) {
    const y = event.contentOffset.y;
    const max = Math.max(
      0,
      event.contentSize.height - event.layoutMeasurement.height,
    );
    if (context) {
      const next = nextDockScroll(y, anchor.current, context.collapsed, max);
      anchor.current = next.anchor;
      if (next.collapsed !== context.collapsed) {
        context.setCollapsed(next.collapsed);
      }
    }
    if (
      onReachEnd &&
      y >= max - 240 &&
      endHeight.current !== event.contentSize.height
    ) {
      endHeight.current = event.contentSize.height;
      onReachEnd();
    } else if (y < max - 240) {
      endHeight.current = 0;
    }
  }
  return (
    <FlatList
      {...props}
      ref={ref}
      onScroll={scroll}
      scrollEventThrottle={16}
      contentContainerStyle={[contentContainerStyle, dockPadding]}
    />
  );
});
