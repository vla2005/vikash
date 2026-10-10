import { creditCardLabel } from '../utils/creditCards';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TransactionDetailsLayout, { CategoryRow, DetailRow, detailStyles as s } from '../components/TransactionDetailsLayout';
import Icon from '../components/Icon';
import useTransactionDetails from '../hooks/useTransactionDetails';
import TranscriptionDisclosure from '../components/TranscriptionDisclosure';
import DeleteTransactionButton from '../components/DeleteTransactionButton';
import EditTransactionButton from '../components/EditTransactionButton';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const statuses = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Fatura paga' };
export default function CreditCardPurchaseDetailsScreen({ uuid, accessToken, onBack, selectedInvoiceUuid, onOpenInvoice, onDeleted, onEdit }) {
  const state = useTransactionDetails(uuid, accessToken, true);
  const data = state.details;
  const equalInstallments = data?.installments?.length && data.installments.every(item => item.amount === data.installments[0].amount);
  return <TransactionDetailsLayout {...state} title="Detalhes da compra" onBack={onBack} subtitle="Compra no crédito" amountLabel="Valor total da compra"
    heroAction={onEdit && <EditTransactionButton purchase onPress={() => onEdit(data)} />}>
    {data && <>
      <Text style={s.section}>Informações da compra</Text>
      <View style={s.group}><CategoryRow category={data.category} /><DetailRow label="Cartão de crédito" value={creditCardLabel(data.creditCard)} institution={data.creditCard.financialInstitution} /></View>
      <View style={local.heading}><Text style={local.section}>Parcelamento</Text><View style={local.count}><Text style={local.countText}>{equalInstallments ? `${data.installmentCount}x de ${formatCurrency(data.installments[0].amount)}` : `${data.installmentCount} parcelas`}</Text></View></View>
      <Text style={local.hint}>Toque em uma parcela para ver a fatura.</Text>
      <View style={local.installments}>{data.installments.map(item => {
        const [year, month] = item.referenceMonth.split('-');
        const selected = item.creditCardInvoiceUuid === selectedInvoiceUuid;
        return <Pressable key={item.uuid} accessibilityRole="button" accessibilityLabel={`Abrir fatura ${months[Number(month) - 1]} ${year}`} accessibilityState={{ selected }} onPress={() => onOpenInvoice?.(data.creditCard.uuid, item.creditCardInvoiceUuid)} style={({ pressed }) => [local.installment, selected && local.selected, pressed && local.pressed]}>
          <View style={[local.numberTile, selected && local.numberTileSelected]}><Text style={[local.number, selected && local.numberSelected]}>{item.installmentNumber}/{data.installmentCount}</Text></View>
          <View style={local.info}><Text style={local.month}>{months[Number(month) - 1]} {year}</Text><Text style={[local.caption, selected && local.selectedCaption]}>{selected ? 'Fatura selecionada' : 'Fatura do cartão'}</Text></View>
          <View style={local.price}><Text style={local.amount}>{formatCurrency(item.amount)}</Text><View style={[local.status, item.status === 'PAID' ? local.paid : item.status === 'CLOSED' ? local.closed : local.open]}><Text style={[local.statusText, item.status === 'PAID' ? local.paidText : item.status === 'CLOSED' ? local.closedText : local.openText]}>{statuses[item.status] || 'Não informado'}</Text></View></View>
          <Icon name="chevron" size={16} color={selected ? colors.primary : '#A4A79F'} />
        </Pressable>;
      })}</View>
      <View style={local.notice}><Icon name="info" color={colors.primary} size={21} /><Text style={local.noticeText}>O saldo da conta muda ao pagar a fatura.</Text></View>
      <TranscriptionDisclosure key={data.uuid} transcription={data.transcription} />
      <DeleteTransactionButton details={data} purchase accessToken={accessToken} onDeleted={onDeleted || onBack} />
    </>}
  </TransactionDetailsLayout>;
}
const local = StyleSheet.create({
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  section: { fontFamily: fontFamilyBold, fontSize: 18, fontWeight: '700', letterSpacing: -0.4, color: colors.text },
  count: { backgroundColor: '#E9EEFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  countText: { fontFamily: fontFamilyMedium, fontSize: 12, fontWeight: '600', color: '#295CCC' },
  hint: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary, marginBottom: 16 },
  installments: { gap: 8, marginBottom: 20 },
  installment: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEECE6', minHeight: 86 },
  selected: { backgroundColor: '#F0F5FF', borderColor: '#BBD1FF' },
  pressed: { opacity: 0.65 },
  numberTile: { width: 34, height: 38, borderRadius: 10, backgroundColor: '#F3F3EF', alignItems: 'center', justifyContent: 'center' },
  numberTileSelected: { backgroundColor: colors.primary },
  number: { fontFamily: fontFamilyMedium, fontSize: 12, fontWeight: '600', color: colors.secondary },
  numberSelected: { color: '#FFF' },
  info: { flex: 1, gap: 5 },
  month: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.text },
  caption: { fontFamily, fontSize: 11, lineHeight: 16, color: colors.secondary },
  selectedCaption: { color: colors.primary },
  price: { alignItems: 'flex-end', gap: 7, flexShrink: 1 },
  amount: { fontFamily: fontFamilyBold, fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  status: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontFamily: fontFamilyMedium, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  open: { backgroundColor: '#E7EEFF' }, openText: { color: '#3861B4' },
  closed: { backgroundColor: '#FBEDCE' }, closedText: { color: '#956D17' },
  paid: { backgroundColor: '#E0F0E5' }, paidText: { color: '#33734D' },
  notice: { paddingHorizontal: 4, paddingVertical: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 22 },
  noticeText: { flex: 1, fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary },
});
