import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import AnimatedMicButton from './AnimatedMicButton';
import { colors, fontFamily } from '../theme';

export const mainTabs = [
  { key: 'Home', label: 'Início', icon: 'home' },
  { key: 'Statement', label: 'Extrato', icon: 'statement' },
  { key: 'AccountManagement', label: 'Contas', icon: 'walletFilled' },
  { key: 'Categories', label: 'Categorias', icon: 'categories' },
];

export default function BottomNavigator({ selected, onSelect, onMicrophone, microphoneOpen }) {
  const insets = useSafeAreaInsets();
  function tab(item) {
    const active = selected === item.key;
    return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
      onPress={() => onSelect(item.key)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={styles.icon}><Icon name={item.icon} size={23} color={active ? '#0666FF' : '#686868'} /></View>
      <Text numberOfLines={1} style={[styles.label, active && styles.selectedLabel]}>{item.label}</Text>
    </Pressable>;
  }
  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]} testID="bottom-navigator">
    {mainTabs.slice(0, 2).map(tab)}
    <View style={styles.micSlot}><View style={styles.mic}><AnimatedMicButton onPress={onMicrophone} animate={!microphoneOpen} /></View></View>
    {mainTabs.slice(2).map(tab)}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#EDECE8', paddingTop: 8, paddingHorizontal: 5, minHeight: 82 },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily, fontSize: 11, lineHeight: 16, color: '#686868', fontWeight: '500' },
  selectedLabel: { color: '#0666FF', fontWeight: '600' },
  micSlot: { width: 88, alignItems: 'center' },
  mic: { position: 'absolute', top: -22 },
  pressed: { opacity: 0.7 },
});
