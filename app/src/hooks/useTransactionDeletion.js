import { useRef, useState } from 'react';
import { deleteCreditCardPurchase, deleteTransaction } from '../services/transactions';
import { formatCurrency } from '../utils/money';
import useToast from './useToast';

export default function useTransactionDeletion(accessToken, onDeleted) {
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const { showToast } = useToast();

  function requestDelete(item, purchase = false) {
    if (busy.current) { return; }
    setError('');
    setPending({ ...item, purchase: purchase || !!item.purchaseUuid, uuid: item.purchaseUuid || item.uuid || item.id });
  }
  function cancel() { if (!busy.current) { setPending(null); setError(''); } }
  async function confirm() {
    if (!pending || busy.current) { return; }
    busy.current = true; setSaving(true); setError('');
    try {
      const remove = pending.purchase ? deleteCreditCardPurchase : deleteTransaction;
      await remove(pending.uuid, accessToken);
    } catch (failure) {
      setError(failure.message || 'Não foi possível excluir. Tente novamente.');
      showToast({ type: 'error', message: 'Não foi possível excluir o lançamento.' });
      busy.current = false; setSaving(false);
      return;
    }
    busy.current = false; setSaving(false); setPending(null);
    showToast({ type: 'success', message: pending.purchase ? 'Compra excluída. Limite atualizado.' : 'Transação excluída. Saldo atualizado.' });
    onDeleted?.(pending);
  }

  let effect = 'O efeito desse lançamento no saldo da conta será revertido.';
  if (pending?.type === 'TRANSFER') { effect = 'Os saldos das duas contas serão revertidos.'; }
  if (pending?.type === 'INVOICE_PAYMENT') { effect = 'O valor voltará ao saldo da conta e a fatura ficará fechada, aguardando pagamento.'; }
  if (pending?.purchase) { effect = 'A compra inteira e todas as suas parcelas serão removidas das faturas. O limite será liberado. Se houver parcelas pagas, desfaça esses pagamentos primeiro.'; }
  return { requestDelete, saving, dialogProps: {
    visible: !!pending, title: pending?.purchase ? 'Excluir compra?' : 'Excluir transação?',
    message: `Excluir “${pending?.description || ''}”${pending?.amount != null && !pending?.purchaseUuid ? ` de ${formatCurrency(pending.amount)}` : ''}? ${effect} Essa ação não pode ser desfeita.`,
    confirmText: pending?.purchase ? 'Excluir compra' : 'Excluir transação', variant: 'danger', icon: 'trash',
    loading: saving, error, onConfirm: confirm, onCancel: cancel,
  } };
}
