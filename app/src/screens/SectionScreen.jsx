import { useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '../theme';

export default function SectionScreen({ title }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.screen}><Text style={styles.text}>{title}</Text></View>;
}
const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily, fontSize: 24, color: colors.text },
});
