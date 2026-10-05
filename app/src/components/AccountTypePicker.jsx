import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { accountTypes } from '../constants/accountTypes';
import { fontFamilyMedium, colors, fontFamily, typography } from '../theme';

export default function AccountTypePicker({ value, onChange }) {
  return <View style={styles.container}>
    <Text style={typography.label}>Tipo de conta</Text>
    <View accessibilityRole="radiogroup" style={styles.grid}>
      {accountTypes.map(type => {
        const selected = value === type.value;
        return <Pressable key={type.value} accessibilityRole="radio" accessibilityLabel={type.label} accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => onChange(type.value)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
          <View style={styles.optionHeader}><Icon name={type.icon} size={28} color={type.color} /><View style={[styles.radio, selected && styles.radioChecked]}>{selected && <Icon name="check" size={12} color={colors.surface} />}</View></View>
          <Text style={styles.name}>{type.label}</Text><Text style={styles.description}>{type.description}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  option: { width: '48.3%', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', padding: 16, minHeight: 130 },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.75 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  radio: { width: 18, height: 18, borderWidth: 1, borderColor: '#BDC0C7', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  radioChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 5 },
  description: { fontFamily, fontSize: 13, color: colors.secondary, lineHeight: 18 },
});
