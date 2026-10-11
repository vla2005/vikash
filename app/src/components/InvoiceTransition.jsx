import React, { useLayoutEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';

export default function InvoiceTransition({ invoiceUuid, children }) {
  const progress = useRef(new Animated.Value(1)).current;
  const previous = useRef(invoiceUuid);
  const reducedMotion = useReducedMotion();
  useLayoutEffect(() => {
    const changed = previous.current !== invoiceUuid;
    previous.current = invoiceUuid;
    if (!changed || reducedMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [invoiceUuid, reducedMotion, progress]);
  return <Animated.View testID="invoice-transition" style={{
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  }}>{children}</Animated.View>;
}
