import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fontFamily } from '../theme';

export default function InlineNotice({ message, error = false }) {
  if (!message) { return null; }
  return <View accessibilityRole={error ? 'alert' : 'text'} style={[styles.container, error && styles.error]}>
    <Icon name="info" color={error ? colors.error : colors.primary} size={20} />
    <Text style={[styles.text, error && styles.errorText]}>{message}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 12 },
  error: { backgroundColor: colors.errorSoft },
  text: { flex: 1, color: colors.text, fontFamily, fontSize: 14, lineHeight: 20 },
  errorText: { color: colors.error },
});
