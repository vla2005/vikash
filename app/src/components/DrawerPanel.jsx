import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';

// O fundo fica no modal; somente o painel recebe o movimento de entrada.
export default function DrawerPanel({ visible = true, style, children, ...props }) {
  const slide = useRef(new Animated.Value(180)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) { slide.setValue(180); return; }
    if (reducedMotion) { slide.setValue(0); return; }
    slide.setValue(180);
    const animation = Animated.spring(slide, {
      toValue: 0, damping: 24, stiffness: 200, useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [visible, reducedMotion, slide]);

  return <Animated.View accessibilityViewIsModal {...props}
    style={[style, { transform: [{ translateY: slide }] }]}>{children}</Animated.View>;
}
