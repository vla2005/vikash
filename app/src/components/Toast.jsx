import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { fontFamilyBold, colors, fontFamily } from '../theme';

export const toastVariants = {
  success: { color: '#248455', soft: '#EAF6EF', border: '#D5EBDD', icon: 'check', title: 'Tudo certo' },
  error: { color: '#C44444', soft: '#FCEEEE', border: '#F3D8D8', icon: 'close', title: 'Não foi possível concluir' },
  warn: { color: '#A77812', soft: '#FFF6DB', border: '#F0E3B8', icon: 'warning', title: 'Confira os dados' },
  info: { color: '#2467CE', soft: '#EDF4FF', border: '#D6E4FA', icon: 'info', title: 'Uma informação para você' },
};

export default function Toast({ type = 'info', title, message, duration, onClose }) {
  const variant = toastVariants[type] || toastVariants.info;
  const entrance = useRef(new Animated.Value(0)).current;
  const lifetime = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(lifetime, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [duration, entrance, lifetime]);
  return <Animated.View accessibilityRole="alert" accessibilityLiveRegion={type === 'error' ? 'assertive' : 'polite'} style={[styles.card, { borderColor: variant.border, opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }]} testID="toast">
    <View style={[styles.accent, { backgroundColor: variant.color }]} />
    <View style={[styles.badge, { backgroundColor: variant.soft }]}><Icon name={variant.icon} size={22} color={variant.color} /></View>
    <View style={styles.copy}><Text style={styles.title}>{title || variant.title}</Text><Text style={styles.message}>{message}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar notificação" onPress={onClose} style={styles.close}><Icon name="close" size={17} color="#85858B" /></Pressable>
    <View pointerEvents="none" style={[styles.track, { backgroundColor: variant.soft }]}><Animated.View style={[styles.progress, { backgroundColor: variant.color, transform: [{ scaleX: lifetime }] }]} /></View>
  </Animated.View>;
}
const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 430, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, padding: 16, paddingLeft: 18, gap: 12, overflow: 'hidden', elevation: 8, shadowColor: '#182D40', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18 },
  accent: { position: 'absolute', top: 16, bottom: 16, left: 0, width: 3, borderRadius: 2 },
  badge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4, paddingBottom: 4 },
  title: { fontFamily: fontFamilyBold, fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.text },
  message: { fontFamily, fontSize: 13, lineHeight: 19, color: '#62666B' },
  close: { width: 28, minHeight: 38, alignItems: 'center', justifyContent: 'center', marginRight: -5 },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  progress: { width: '100%', height: 3 },
});
