import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text } from 'react-native';
import appIcon from '../assets/appIcon';
import useReducedMotion from '../hooks/useReducedMotion';
import { hideNativeSplash } from '../services/nativeSplash';
import { colors, fontFamilyBold } from '../theme';

export default function AnimatedSplash({ ready, onFinish }) {
  const [layoutReady, setLayoutReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!layoutReady || !imageReady) { return; }
    let active = true;
    hideNativeSplash().then(() => { if (active) { setVisible(true); } });
    return () => { active = false; };
  }, [layoutReady, imageReady]);

  useEffect(() => {
    if (!visible || !ready) { return; }
    if (reduced) {
      reveal.setValue(1);
      scale.setValue(1);
      setIntroFinished(true);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(reveal, { toValue: 1, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(scale, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    ]);
    animation.start(({ finished }) => { if (finished) { setIntroFinished(true); } });
    return () => animation.stop();
  }, [visible, ready, reduced, reveal, scale, nativeDriver]);

  useEffect(() => {
    if (!ready || !introFinished) { return; }
    const animation = Animated.timing(opacity, { toValue: 0, duration: reduced ? 0 : 220, useNativeDriver: nativeDriver });
    animation.start(({ finished }) => { if (finished) { onFinish(); } });
    return () => animation.stop();
  }, [ready, introFinished, opacity, reduced, nativeDriver, onFinish]);

  return <Animated.View testID="animated-splash" accessibilityLabel="Abrindo Vikash" accessibilityState={{ busy: true }}
    onLayout={() => setLayoutReady(true)} style={[styles.overlay, { opacity }]}>
    <Animated.View style={{ transform: [{ scale }] }}>
      <Image source={appIcon} style={styles.symbol} resizeMode="contain" onLoadEnd={() => setImageReady(true)} />
    </Animated.View>
    {ready && <Animated.View style={[styles.wordmark, { opacity: reveal, transform: [{ translateY: reduced ? 0 : reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Text style={styles.name}>vikash</Text>
    </Animated.View>}
  </Animated.View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 100, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  symbol: { width: 180, height: 180 },
  wordmark: { position: 'absolute', top: '50%', marginTop: 92 },
  name: { fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 48, letterSpacing: -1.6, color: colors.text },
});
