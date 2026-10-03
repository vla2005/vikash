import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import useReducedMotion from '../hooks/useReducedMotion';

const heights = [4, 9, 15, 24, 12, 8, 17, 28, 39, 26, 13, 10, 18, 28, 44, 35, 21, 12, 9, 16, 27, 40, 29, 15, 10, 18, 11, 6, 12, 20, 10, 7, 4];
export default function VoiceWaveform({ active }) {
  const reduced = useReducedMotion();
  const values = useRef(heights.map(() => new Animated.Value(0.45))).current;
  useEffect(() => {
    if (!active) { values.forEach(value => value.setValue(0.25)); return; }
    const animations = values.map((value, index) => Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: reduced ? 900 : 180 + (index % 5) * 65, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(value, { toValue: reduced ? 0.65 : 0.3, duration: reduced ? 900 : 250 + (index % 4) * 80, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ])));
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [active, reduced, values]);
  return <View accessible={false} style={styles.wave}>{heights.map((height, index) => <Animated.View key={index} style={[styles.bar, index < 6 || index > 26 ? styles.faint : styles.strong, { height, transform: [{ scaleY: values[index] }] }]} />)}</View>;
}
const styles = StyleSheet.create({
  wave: { height: 48, width: '100%', maxWidth: 290, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 18 },
  bar: { width: 3.5, borderRadius: 3, backgroundColor: '#0666FF' },
  faint: { opacity: 0.4 },
  strong: { opacity: 0.9 },
});
