import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';

function AnimatedMicButton({ onPress, large = false, animate = true, diameter }) {
  const waves = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const breathing = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    waves.forEach(wave => wave.setValue(0));
    breathing.setValue(1);
    if (!animate) { return; }
    const duration = reduced ? 2400 : 1400;
    const nativeDriver = Platform.OS !== 'web';
    // Cada onda começa depois da anterior; o reinício acontece enquanto está invisível.
    const ripples = waves.map((wave, index) => Animated.sequence([
      Animated.delay(index * duration / 3),
      Animated.loop(Animated.timing(wave, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false })),
    ]));
    const breath = Animated.loop(Animated.sequence([
      Animated.timing(breathing, { toValue: reduced ? 1.015 : 1.055, duration: reduced ? 1200 : 650, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(breathing, { toValue: 1, duration: reduced ? 1200 : 650, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    ripples.forEach(animation => animation.start());
    breath.start();
    return () => { ripples.forEach(animation => animation.stop()); breath.stop(); waves.forEach(wave => wave.setValue(0)); breathing.setValue(1); };
  }, [waves, breathing, reduced, animate]);
  const size = diameter || (large ? 96 : 64);
  return <View style={[styles.container, { width: size, height: size }]}>
    {waves.map((wave, index) => <Animated.View key={index} pointerEvents="none" style={[styles.wave, {
      borderRadius: size / 2,
      opacity: wave.interpolate({ inputRange: [0, 0.06, 0.45, 0.8, 1], outputRange: reduced ? [0, 0.5, 0.35, 0.12, 0] : [0, 0.65, 0.45, 0.15, 0] }),
      transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1.16, reduced ? 1.5 : 1.9] }) }],
    }]} />)}
    <View pointerEvents="none" style={[styles.halo, { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2 }]} />
    <Animated.View style={{ transform: [{ scale: breathing }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={large ? 'Microfone' : 'Registrar por voz'}
      onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.button, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}>
      <Icon name="microphone" size={large ? size * 0.42 : 34} color="#FFFFFF" />
    </Pressable>
    </Animated.View>
  </View>;
}
export default memo(AnimatedMicButton);
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderWidth: 1.5, borderColor: '#D6E4FF', backgroundColor: '#FFFFFF' },
  wave: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: '#0666FF' },
  button: { backgroundColor: '#0666FF', alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.96 }], backgroundColor: '#0054DE' },
});
