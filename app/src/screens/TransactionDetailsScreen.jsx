import { creditCardLabel } from '../utils/creditCards';
import React from 'react';
import { Text, View } from 'react-native';
import TransactionDetailsLayout, { CategoryRow, DetailRow, detailStyles as s } from '../components/TransactionDetailsLayout';
import useTransactionDetails from '../hooks/useTransactionDetails';
import TranscriptionDisclosure from '../components/TranscriptionDisclosure';
import DeleteTransactionButton from '../components/DeleteTransactionButton';
import EditTransactionButton from '../components/EditTransactionButton';

const methods = { PIX: 'Pix', DEBIT_CARD: 'Débito', BANK_SLIP: 'Boleto', BANK_TRANSFER: 'Transferência', CASH: 'Dinheiro', OTHER: 'Outro' };
const types = { INCOME: 'Entrada', EXPENSE: 'Saída', TRANSFER: 'Transferência entre contas', INVOICE_PAYMENT: 'Pagamento de fatura' };
export default function TransactionDetailsScreen({ uuid, accessToken, onBack, onDeleted, onEdit }) {
  const state = useTransactionDetails(uuid, accessToken);
  const data = state.details;
  return <TransactionDetailsLayout {...state} title="Detalhes da transação" onBack={onBack} subtitle={types[data?.type]}
    heroAction={onEdit && <EditTransactionButton onPress={() => onEdit(data)} />}
    sign={data?.type === 'INCOME' ? '+ ' : ['EXPENSE', 'INVOICE_PAYMENT'].includes(data?.type) ? '− ' : ''} amountLabel={methods[data?.paymentMethod] ? `Pagamento via ${methods[data.paymentMethod]}` : 'Valor da transação'}>
    {data && <>
      <Text style={s.section}>Informações da transação</Text>
      <View style={s.group}><CategoryRow category={data.category} />
        <DetailRow label={data.type === 'TRANSFER' ? 'Conta de origem' : 'Conta'} value={data.account?.description || 'Não informada'} institution={data.account?.financialInstitution} icon={data.account?.type === 'CARTEIRA' ? 'wallet' : null} />
        {data.destinationAccount && <DetailRow label="Conta de destino" value={data.destinationAccount.description} institution={data.destinationAccount.financialInstitution} />}
        {data.creditCard && <DetailRow label="Cartão" value={creditCardLabel(data.creditCard)} institution={data.creditCard.financialInstitution} />}
        <DetailRow label="Forma de pagamento" value={methods[data.paymentMethod] || 'Outro'} />
      </View>
      <TranscriptionDisclosure key={data.uuid} transcription={data.transcription} emptyMessage="Transação registrada sem comando de voz." />
      <DeleteTransactionButton details={data} accessToken={accessToken} onDeleted={onDeleted || onBack} />
    </>}
  </TransactionDetailsLayout>;
}
