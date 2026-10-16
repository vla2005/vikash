import React, { memo, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import useReducedMotion from '../../hooks/useReducedMotion';

const OUT_CUBIC = Easing.out(Easing.cubic);
const PRESS_SPRING = { damping: 20, stiffness: 360, mass: 0.6 };

/**
 * Pressable animado 100% na UI thread (Reanimated 4) sem re-renderizar o componente React.
 * Usa apenas transform (scale) e opacity com aritmética direta para manter 60-120 FPS.
 */
export const AnimatedPressable = memo(function AnimatedPressable({
  children,
  style,
  containerStyle,
  scaleActive = 0.97,
  disabled = false,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.get();
    return {
      transform: [{ scale: 1 + (scaleActive - 1) * p }],
      opacity: 1 - 0.08 * p,
    };
  });

  function handlePressIn(event) {
    if (!reducedMotion && !disabled) {
      pressed.set(withTiming(1, { duration: 100, easing: OUT_CUBIC }));
    }
    onPressIn?.(event);
  }

  function handlePressOut(event) {
    if (!reducedMotion) {
      pressed.set(withSpring(0, PRESS_SPRING));
    }
    onPressOut?.(event);
  }

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});

/**
 * Container de entrada escalonada na UI thread (fade + slide vertical suave).
 */
export const StaggeredSection = memo(function StaggeredSection({
  index = 0,
  delay = 0,
  distance = 14,
  style,
  children,
  triggerKey,
}) {
  const reducedMotion = useReducedMotion();
  const skipInitialOnAndroid =
    Platform.OS === 'android' && triggerKey === undefined;
  const shouldAnimate = !reducedMotion && !skipInitialOnAndroid;
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) {
      progress.set(1);
      return;
    }
    progress.set(0);
    const totalDelay = Math.min(index * 48 + delay, 320);
    progress.set(
      withDelay(
        totalDelay,
        withTiming(1, { duration: 320, easing: OUT_CUBIC }),
      ),
    );
  }, [delay, index, progress, shouldAnimate, triggerKey]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * distance }],
    };
  });

  if (skipInitialOnAndroid) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
});

/**
 * Barra de progresso horizontal animada na UI thread usando scaleX (zero recálculo de layout Yoga).
 */
export const AnimatedProgressBar = memo(function AnimatedProgressBar({
  progress = 0,
  color = '#F59E0B',
  trackColor = 'rgba(255, 255, 255, 0.07)',
  height = 6,
  delay = 60,
  style,
}) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(
    0,
    Math.min(1, Number.isFinite(progress) ? progress : 0),
  );
  const fill = useSharedValue(reducedMotion ? clamped : 0);

  useEffect(() => {
    if (reducedMotion) {
      fill.set(clamped);
      return;
    }
    fill.set(
      withDelay(
        delay,
        withTiming(clamped, { duration: 480, easing: OUT_CUBIC }),
      ),
    );
  }, [clamped, delay, fill, reducedMotion]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.001, fill.get()) }],
  }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            transformOrigin: 'left center',
          },
          barStyle,
        ]}
      />
    </View>
  );
});

/**
 * Indicador luminoso de status.
 */
export const PulseDot = memo(function PulseDot({
  color = '#10B981',
  size = 8,
}) {
  return (
    <View
      style={{
        width: size + 6,
        height: size + 6,
        borderRadius: (size + 6) / 2,
        backgroundColor: `${color}28`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
});

/**
 * Transição suave entre estado visível e oculto (•••) usando reacticx FadeComponent.
 */
export const AnimatedRevealValue = memo(function AnimatedRevealValue({
  hidden = false,
  visibleContent,
  hiddenContent,
  duration = 180,
  style,
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      opacity.set(1);
      offset.set(0);
      return;
    }
    opacity.set(0.25);
    offset.set(4);
    opacity.set(withTiming(1, { duration, easing: OUT_CUBIC }));
    offset.set(withTiming(0, { duration, easing: OUT_CUBIC }));
  }, [hidden, duration, reducedMotion, opacity, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: offset.get() }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {hidden ? hiddenContent : visibleContent}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
  },
});
