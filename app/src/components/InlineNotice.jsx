import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { fontFamily } from '../theme';

export default function InlineNotice({ message, error = false }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  if (!message) { return null; }
  return <View accessibilityRole={error ? 'alert' : 'text'} style={[styles.container, error && styles.error]}>
    <Icon name="info" color={error ? colors.error : colors.primary} size={20} />
    <Text style={[styles.text, error && styles.errorText]}>{message}</Text>
  </View>;
}
const createStyles = (colors) => StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 12 },
  error: { backgroundColor: colors.errorSoft },
  text: { flex: 1, color: colors.text, fontFamily, fontSize: 14, lineHeight: 20 },
  errorText: { color: colors.error },
});
