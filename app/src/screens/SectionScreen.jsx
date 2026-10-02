import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../theme';

export default function SectionScreen({ title }) {
  return <View style={styles.screen}><Text style={styles.text}>{title}</Text></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily, fontSize: 24, color: colors.text },
});
