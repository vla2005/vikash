import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ConfirmationDialog from './ConfirmationDialog';
import Icon from './Icon';
import useTransactionDeletion from '../hooks/useTransactionDeletion';
import { colors, fontFamilyMedium } from '../theme';

export default function DeleteTransactionButton({ details, purchase = false, accessToken, onDeleted }) {
  const deletion = useTransactionDeletion(accessToken, onDeleted);
  const label = purchase ? 'Excluir compra' : 'Excluir transação';
  return <View style={s.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={deletion.saving}
      onPress={() => deletion.requestDelete(details, purchase)} style={({ pressed }) => [s.button, pressed && s.pressed]}>
      <Icon name="trash" size={20} color={colors.error} /><Text style={s.text}>{label}</Text>
    </Pressable>
    <ConfirmationDialog {...deletion.dialogProps} />
  </View>;
}
const s = StyleSheet.create({
  container: { marginTop: 12 },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.errorSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  text: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.error },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
