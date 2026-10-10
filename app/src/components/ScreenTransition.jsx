import React, { useLayoutEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';

export default function ScreenTransition({ sceneKey, depth = 0, order = 0, fade = false, children }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const previous = useRef(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { sceneKey, depth, order };
    if (!last || reducedMotion) {
      opacity.setValue(1); translateX.setValue(0);
      return;
    }
    if (last.sceneKey === sceneKey) { return; }
    const goingBack = depth < last.depth || (depth === last.depth && order < last.order);
    const distance = depth === last.depth ? 32 : 64;
    opacity.setValue(0);
    translateX.setValue(fade ? 0 : (goingBack ? -distance : distance));
    const settings = { duration: goingBack ? 280 : 360, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' };
    const animation = Animated.parallel([
      Animated.timing(opacity, { ...settings, toValue: 1 }),
      Animated.timing(translateX, { ...settings, toValue: 0 }),
    ]);
    animation.start();
    return () => {
      animation.stop();
      opacity.setValue(1); translateX.setValue(0);
    };
  }, [sceneKey, depth, order, fade, reducedMotion, opacity, translateX]);

  return <View style={s.viewport}><Animated.View testID="screen-transition" style={[s.frame, { opacity, transform: [{ translateX }] }]}>{children}</Animated.View></View>;
}

const s = StyleSheet.create({ viewport: { flex: 1, overflow: 'hidden' }, frame: { flex: 1 } });
