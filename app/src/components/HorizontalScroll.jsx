import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

// Touch scrolling stays native; pointer dragging also works on desktop web.
const HorizontalScroll = forwardRef(function HorizontalScroll({ children, style, ...props }, ref) {
  const scroll = useRef(null);
  const drag = useRef(null);
  const blockClick = useRef(false);
  useImperativeHandle(ref, () => scroll.current);

  const webDrag = Platform.OS === 'web' ? {
    onPointerDown: event => {
      blockClick.current = false;
      if (event.pointerType !== 'mouse' || event.button !== 0) { return; }
      const node = scroll.current?.getScrollableNode();
      drag.current = { x: event.clientX, y: event.clientY, offset: node?.scrollLeft || 0, active: false };
    },
    onPointerMove: event => {
      const gesture = drag.current;
      if (!gesture) { return; }
      if (event.buttons !== 1) { drag.current = null; return; }
      const dx = event.clientX - gesture.x;
      if (!gesture.active) {
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(event.clientY - gesture.y)) { return; }
        gesture.active = true;
        blockClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      scroll.current?.scrollTo({ x: Math.max(0, gesture.offset - dx), animated: false });
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
    onPointerLeave: () => { if (!drag.current?.active) { drag.current = null; } },
    onLostPointerCapture: () => { drag.current = null; },
    onClickCapture: event => {
      if (blockClick.current) {
        event.preventDefault();
        event.stopPropagation();
        blockClick.current = false;
      }
    },
  } : {};

  return <ScrollView {...props} {...webDrag} ref={scroll} horizontal
    nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false}
    style={[styles.scroll, Platform.OS === 'web' && styles.web, style]}>
    {children}
  </ScrollView>;
});

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  web: { cursor: 'grab', userSelect: 'none' },
});

export default HorizontalScroll;
