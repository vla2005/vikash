import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import AnimatedMicButton from './AnimatedMicButton';
import { fontFamilyMedium, colors } from '../theme';

export const mainTabs = [
  { key: 'Home', label: 'Início', icon: 'home' },
  { key: 'Statement', label: 'Extrato', icon: 'statement' },
  { key: 'AccountManagement', label: 'Contas', icon: 'walletFilled' },
  { key: 'Categories', label: 'Categorias', icon: 'categories' },
];

export default function BottomNavigator({ selected, onSelect, onMicrophone, microphoneOpen }) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 350;
  function tab(item) {
    const active = selected === item.key;
    return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} aria-selected={active}
      onPress={() => onSelect(item.key)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={styles.icon}><Icon name={item.icon} size={23} color={active ? colors.primary : colors.secondary} /></View>
      <Text numberOfLines={1} style={[styles.label, compact && styles.compactLabel, active && styles.selectedLabel]}>{item.label}</Text>
      <View style={[styles.indicator, active && styles.activeIndicator]} />
    </Pressable>;
  }
  return <View style={[styles.bar, compact && styles.compactBar, { marginBottom: Math.max(insets.bottom, 12) }]} testID="bottom-navigator">
    {mainTabs.slice(0, 2).map(tab)}
    <View style={[styles.micSlot, compact && styles.compactMicSlot]}><View style={styles.mic}><AnimatedMicButton onPress={onMicrophone} animate={!microphoneOpen} /></View></View>
    {mainTabs.slice(2).map(tab)}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 30, marginHorizontal: 12, paddingVertical: 9, paddingHorizontal: 5, minHeight: 76, shadowColor: '#405892', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 3 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamilyMedium, fontSize: 11, lineHeight: 16, color: colors.secondary, fontWeight: '500' },
  selectedLabel: { color: colors.primary, fontWeight: '600' },
  compactBar: { marginHorizontal: 8 }, compactLabel: { fontSize: 10.5 }, compactMicSlot: { width: 66 },
  micSlot: { width: 78, alignItems: 'center' },
  mic: { position: 'absolute', top: -25 },
  indicator: { height: 3, width: 22, borderRadius: 2, backgroundColor: 'transparent' },
  activeIndicator: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
});
