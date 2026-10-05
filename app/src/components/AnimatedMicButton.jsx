import { colors } from '../theme';
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
    const duration = reduced ? 2300 : large ? 1600 : 1700;
    const pause = reduced ? 3800 : large ? 0 : 3400;
    const stagger = large && !reduced ? duration / 3 : 180;
    const nativeDriver = Platform.OS !== 'web';
    // Na navegação, as ondas aparecem em sequência e descansam antes do próximo convite.
    const ripples = waves.map((wave, index) => Animated.sequence([
      Animated.delay(index * stagger),
      Animated.loop(Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }),
        Animated.timing(wave, { toValue: 1, duration: pause, useNativeDriver: nativeDriver, isInteraction: false }),
      ])),
    ]));
    const breath = reduced ? null : Animated.loop(Animated.sequence([
      Animated.timing(breathing, { toValue: large ? 1.04 : 1.035, duration: large ? 950 : 500, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(breathing, { toValue: 1, duration: large ? 950 : 650, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(breathing, { toValue: 1, duration: large ? 0 : 3950, useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    ripples.forEach(animation => animation.start());
    breath?.start();
    return () => { ripples.forEach(animation => animation.stop()); breath?.stop(); waves.forEach(wave => wave.setValue(0)); breathing.setValue(1); };
  }, [waves, breathing, reduced, animate, large]);
  const size = diameter || (large ? 96 : 64);
  return <View testID="animated-microphone" style={[styles.container, { width: size, height: size }]}>
    {waves.map((wave, index) => <Animated.View key={index} pointerEvents="none" style={[styles.wave, {
      borderRadius: size / 2,
      opacity: !animate ? 0 : wave.interpolate({ inputRange: [0, 0.12, 0.45, 0.8, 1], outputRange: reduced ? [0, 0.14, 0.1, 0.04, 0] : [0, 0.25, 0.16, 0.06, 0] }),
      // Movimento reduzido mantém apenas a mudança suave de opacidade, sem expansão.
      transform: [{ scale: reduced ? 1.12 + index * 0.13 : wave.interpolate({ inputRange: [0, 1], outputRange: [1.12, large ? 1.75 : 1.45] }) }],
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
  wave: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: colors.primary },
  button: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.96 }], backgroundColor: colors.primaryPressed },
});
