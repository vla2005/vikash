import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily } from '../theme';

export default function AccountRow({ account, onPress, last }) {
  const type = getAccountType(account.type);
  const institution = account.financialInstitution;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${account.name}`} onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.separator, pressed && styles.pressed]}>
    <InstitutionLogo institution={institution} size={44} fallbackIcon={type.icon} fallbackColor={type.color} />
    <View style={styles.info}><Text style={styles.name} numberOfLines={1}>{account.name}</Text><Text style={styles.type}>{institution ? `${institution.name} · ${type.label}` : type.label}</Text></View>
    <Text style={styles.balance}>{formatCurrency(account.balance)}</Text><Icon name="edit" size={20} color={colors.secondary} />
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  separator: { borderBottomWidth: 1, borderBottomColor: colors.border },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.text },
  type: { fontFamily, fontSize: 12, color: colors.secondary },
  balance: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], maxWidth: '42%' },
  pressed: { opacity: 0.65 },
});
