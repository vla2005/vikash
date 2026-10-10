import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';
import { colors } from '../theme';

const actionWidth = 72;
export default function SwipeableRow({ children, open, onOpenChange, onPress, onAction, label, actionLabel, style, containerStyle }) {
  const translation = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const origin = useRef(0);
  const lastSwipe = useRef(0);
  const reducedMotion = useReducedMotion();
  const settle = useCallback(shouldOpen => {
    position.current = shouldOpen ? -actionWidth : 0;
    translation.stopAnimation();
    if (reducedMotion) { translation.setValue(position.current); return; }
    Animated.spring(translation, { toValue: position.current, stiffness: 280, damping: 30, mass: 1, useNativeDriver: true }).start();
  }, [reducedMotion, translation]);
  useEffect(() => {
    settle(open);
    return () => translation.stopAnimation();
  }, [open, settle, translation]);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 8
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3 && (gesture.dx < 0 || open),
    onPanResponderGrant: () => {
      origin.current = position.current;
      translation.stopAnimation(value => { origin.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      position.current = Math.max(-actionWidth, Math.min(0, origin.current + gesture.dx));
      translation.setValue(position.current);
    },
    onPanResponderRelease: (_, gesture) => {
      lastSwipe.current = Date.now();
      const shouldOpen = gesture.vx < -0.5 || (gesture.vx <= 0.5 && position.current < -actionWidth / 2);
      settle(shouldOpen);
      onOpenChange(shouldOpen);
    },
    onPanResponderTerminate: () => { lastSwipe.current = Date.now(); settle(open); },
    onPanResponderTerminationRequest: () => false,
  }), [open, onOpenChange, settle, translation]);
  function press() {
    if (Date.now() - lastSwipe.current < 250) { return; }
    if (open) { onOpenChange(false); return; }
    onPress();
  }
  return <View style={[styles.container, containerStyle]}>
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.action, {
      opacity: translation.interpolate({ inputRange: [-actionWidth, -1, 0], outputRange: [1, 1, 0], extrapolate: 'clamp' }),
    }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={!open}
      accessible={open} aria-hidden={!open} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      onPress={onAction} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
      <Icon name="trash" size={23} color={colors.surface} />
    </Pressable>
    </Animated.View>
    <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: translation }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Arraste para a esquerda para excluir."
        accessibilityActions={[{ name: 'delete', label: actionLabel }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') { onAction(); } }}
        onPress={press} onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); settle(true); onOpenChange(true); }
          if (event.key === 'ArrowRight' || event.key === 'Escape') { event.preventDefault(); settle(false); onOpenChange(false); }
        }} style={({ pressed }) => [styles.foreground, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  foreground: { backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surfaceMuted },
  action: { position: 'absolute', top: 0, bottom: 0, right: 0, width: actionWidth, paddingLeft: 12, backgroundColor: colors.surface },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  actionPressed: { backgroundColor: colors.negative },
});
