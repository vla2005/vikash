import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import useReducedMotion from '../hooks/useReducedMotion';

function AnimatedMicButton({ onPress, large = false, animate = true }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!animate) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1, duration: reduced ? 4000 : 2000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [pulse, reduced, animate]);
  const size = large ? 96 : 64;
  return <View style={[styles.container, { width: size, height: size }]}>
    <View pointerEvents="none" style={[styles.ring, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2 }]} />
    <View pointerEvents="none" style={[styles.ring, styles.outerRing, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 }]} />
    {[0, 1].map(index => {
      const waveStyle = {
      borderRadius: size / 2,
      opacity: !animate ? 0 : pulse.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: index ? [0.28, 0.12, 0, 0.5, 0.28] : [0.5, 0.35, 0.22, 0.1, 0] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: reduced ? (index ? [1.3, 1.4, 1.2, 1.3] : [1.2, 1.3, 1.31, 1.4]) : (index ? [1.3, 1.6, 1.02, 1.3] : [1.02, 1.3, 1.31, 1.6]) }) }],
      };
      return <Animated.View key={index} style={[styles.wave, waveStyle]} />;
    })}
    <Pressable accessibilityRole="button" accessibilityLabel={large ? 'Microfone' : 'Registrar por voz'}
      onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.button, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}>
      <Icon name="microphone" size={large ? 40 : 34} color="#FFFFFF" />
    </Pressable>
  </View>;
}
export default memo(AnimatedMicButton);
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2.5, borderColor: '#A8C7FF', backgroundColor: '#FFFFFF' },
  outerRing: { borderColor: '#E2ECFF', backgroundColor: 'transparent' },
  wave: { pointerEvents: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: '#0666FF' },
  button: { backgroundColor: '#0666FF', alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.96 }], backgroundColor: '#0054DE' },
});
