import React from 'react';
import { StyleSheet, View } from 'react-native';
import ConfirmationDialog from './ConfirmationDialog';
import DeleteActionButton from './DeleteActionButton';
import useTransactionDeletion from '../hooks/useTransactionDeletion';

export default function DeleteTransactionButton({ details, purchase = false, accessToken, onDeleted }) {
  const deletion = useTransactionDeletion(accessToken, onDeleted);
  const label = purchase ? 'Excluir compra' : 'Excluir transação';
  return <View style={s.container}>
    <DeleteActionButton label={label} disabled={deletion.saving} onPress={() => deletion.requestDelete(details, purchase)} />
    <ConfirmationDialog {...deletion.dialogProps} />
  </View>;
}
const s = StyleSheet.create({
  container: { marginTop: 12 },
});
