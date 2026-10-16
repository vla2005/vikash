import React from 'react';
import { StyleSheet } from 'react-native';
import GlassMaterial from '../silver/GlassMaterial';
export default function AssistantReturnSurface({ children }) {
  return <GlassMaterial blurred={false} navigation style={styles.surface}>{children}</GlassMaterial>;
}
const styles = StyleSheet.create({ surface:{ flex:1,borderRadius:0,borderWidth:0 } });
