import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ConfirmationDialog from './ConfirmationDialog';
import DeleteActionButton from './DeleteActionButton';
import { deleteCreditCardInvoice } from '../services/creditCards';
import useToast from '../hooks/useToast';

export default function DeleteInvoiceButton({ invoice, monthLabel, accessToken, onDeleted }) {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const { showToast } = useToast();

  function open() {
    if (busy.current) { return; }
    setError('');
    setVisible(true);
  }

  function cancel() {
    if (busy.current) { return; }
    setVisible(false);
    setError('');
  }

  async function confirm() {
    if (!visible || busy.current || !invoice.deletable || invoice.total !== 0) { return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await deleteCreditCardInvoice(invoice.uuid, accessToken);
    } catch (failure) {
      setError(failure.message || 'Não foi possível excluir a fatura. Tente novamente.');
      busy.current = false;
      setSaving(false);
      return;
    }
    busy.current = false;
    setSaving(false);
    setVisible(false);
    showToast({ type: 'success', message: 'Fatura excluída.' });
    onDeleted?.(invoice);
  }

  return <View style={s.container}>
    <DeleteActionButton label="Excluir fatura" disabled={saving} onPress={open} />
    <ConfirmationDialog visible={visible} title="Excluir fatura?"
      message={`A fatura de ${monthLabel} está vazia e será removida da lista. O saldo e o limite do cartão permanecem iguais. Essa ação não pode ser desfeita.`}
      confirmText="Excluir fatura" variant="danger" icon="trash"
      loading={saving} error={error} onConfirm={confirm} onCancel={cancel} />
  </View>;
}

const s = StyleSheet.create({ container: { marginTop: 18 } });
