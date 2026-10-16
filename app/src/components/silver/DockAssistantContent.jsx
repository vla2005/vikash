import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Icon from '../Icon';
import { useThemeTokens } from '../../contexts/ThemeContext';
import { fontFamilyMedium } from '../../theme';
export const assistantDockContentStyle = { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingHorizontal:10, gap:9, minHeight:44 };
export default function DockAssistantContent() {
  const { dock } = useThemeTokens();
  return <><Icon name="sparkles" size={20} color={dock.assistantIcon} />
    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label,{ color:dock.voiceText }]}>Pergunte ao ViKash</Text></>;
}
const styles = StyleSheet.create({ label:{ fontFamily:fontFamilyMedium,fontSize:13,lineHeight:18 } });
