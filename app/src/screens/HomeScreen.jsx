import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '../theme';

export default function HomeScreen() {
  return <View style={styles.screen}><Text style={styles.text}>HOME</Text></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  text: { fontFamily, color: colors.text, fontSize: 24 },
});
