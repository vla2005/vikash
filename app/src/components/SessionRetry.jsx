import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontFamilyMedium, colors, fontFamily } from '../theme';

export default function SessionRetry({ message, onRetry }) {
  return <View style={styles.screen}><Text accessibilityRole="alert" style={styles.message}>{message}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar novamente" onPress={onRetry} style={styles.button}><Text style={styles.label}>Tentar novamente</Text></Pressable></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: colors.background, gap: 20 },
  message: { fontFamily, fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'center', maxWidth: 360 },
  button: { backgroundColor: colors.primary, borderRadius: 12, minHeight: 48, paddingHorizontal: 24, justifyContent: 'center' },
  label: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
