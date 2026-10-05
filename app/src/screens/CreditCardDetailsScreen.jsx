import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import InvoicePaymentDrawer from '../components/InvoicePaymentDrawer';
import PagedTransactionList from '../components/PagedTransactionList';
import { formatInvoiceDate } from '../components/CreditCardInvoiceDrawer';
import useCreditCardDetails from '../hooks/useCreditCardDetails';


import { formatCurrency } from '../utils/money';
import { fontFamily } from '../theme';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const statuses = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Paga' };
function monthLabel(reference) {
  const [year, month] = reference.split('-');
  return `${months[Number(month) - 1]} ${year}`;
}
function Feedback({ loading, error, onRetry, empty }) {
  return <View style={s.feedback}>{loading ? <><ActivityIndicator color="#0666FF" /><Text style={s.muted}>Carregando…</Text></> : error ? <><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={s.action}><Text style={s.link}>Tentar novamente</Text></Pressable></> : <Text style={s.muted}>{empty}</Text>}</View>;
}

export default function CreditCardDetailsScreen({ uuid, accessToken, onBack, onEdit, onPayment, revision = 0 }) {
  const { card, loading, error, retry } = useCreditCardDetails(uuid, accessToken, revision);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentRevision, setPaymentRevision] = useState(0);
  const [selectedUuid, setSelectedUuid] = useState(null);
  const [allVisible, setAllVisible] = useState(false);
  const invoices = useMemo(() => [...(card?.invoices || [])]
    .sort((first, second) => first.referenceMonth.localeCompare(second.referenceMonth)), [card]);
  const invoice = invoices.find(item => item.uuid === selectedUuid)
    || invoices.find(item => item.uuid === card?.currentInvoiceUuid) || invoices[invoices.length - 1];
  const selector = useRef(null);
  useEffect(() => {
    if (card && invoice) {
      const index = invoices.findIndex(item => item.uuid === invoice.uuid);
      selector.current?.scrollTo({ x: Math.max(0, index * 126 - 20), animated: false });
    }
  }, [card, invoices, invoice?.uuid]);
  const select = value => { setSelectedUuid(value); setAllVisible(false); };
  const top = <>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Voltar para contas e cartões" onPress={onBack} style={s.back}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" size={24} /></View></Pressable><Text accessibilityRole="header" style={s.navTitle}>Detalhes do cartão</Text><View style={s.back} /></View>
    {card && <>
      <View style={s.identity}><InstitutionLogo institution={card.financialInstitution} size={52} /><View style={s.identityText}><Text style={s.title}>{card.description}</Text><Text style={s.muted}>{card.financialInstitution?.name} · Cartão de crédito</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar cartão" onPress={() => onEdit?.(card)} style={({ pressed }) => [s.action, pressed && s.pressed]}><Icon name="edit" size={25} color="#111310" /></Pressable></View>
      <View style={s.panel}><View style={s.metrics}><View style={s.metric}><Text style={s.muted}>Limite total</Text><Text adjustsFontSizeToFit numberOfLines={1} style={s.value}>{formatCurrency(card.creditLimit)}</Text></View><View style={[s.metric, s.verticalDivider]}><Text style={s.muted}>Limite disponível</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[s.value, card.availableLimit < 0 && s.negative]}>{formatCurrency(card.availableLimit)}</Text></View></View><View style={s.dates}><Text style={s.date}>Fecha dia {card.closingDay}</Text><Text style={s.date}>Vence dia {card.dueDay}</Text></View></View>
      <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>Faturas</Text>{card.invoices.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Ver todas as faturas" onPress={() => setAllVisible(true)} style={s.action}><Text style={s.link}>Ver todas</Text></Pressable>}</View>
      <ScrollView ref={selector} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.months}>{invoices.map(item => <Pressable key={item.uuid} accessibilityRole="button" accessibilityLabel={`Fatura ${monthLabel(item.referenceMonth)}`} accessibilityState={{ selected: invoice?.uuid === item.uuid }} onPress={() => select(item.uuid)} style={({ pressed }) => [s.month, invoice?.uuid === item.uuid && s.selected, pressed && s.pressed]}><Text style={[s.monthText, invoice?.uuid === item.uuid && s.white]}>{monthLabel(item.referenceMonth)}</Text><Text style={[s.status, item.status === 'PAID' && s.green, invoice?.uuid === item.uuid && s.white]}>{statuses[item.status]}</Text></Pressable>)}</ScrollView>
      {invoice ? <><View style={s.panel}><View style={s.invoiceTitle}><Text style={s.sectionTitle}>Fatura de {monthLabel(invoice.referenceMonth)}</Text><Text style={[s.pill, invoice.status === 'PAID' ? s.paid : invoice.status === 'CLOSED' ? s.closed : s.open]}>{statuses[invoice.status]}</Text></View><Text style={s.invoiceTotal}>{formatCurrency(invoice.total)}</Text><View style={s.invoiceDates}><View style={s.metric}><Text style={s.muted}>Fechamento</Text><Text style={s.date}>{formatInvoiceDate(invoice.closingDate)}</Text></View><View style={s.metric}><Text style={s.muted}>Vencimento</Text><Text style={s.date}>{formatInvoiceDate(invoice.dueDate)}</Text></View></View></View>{invoice.status !== 'PAID' && invoice.total > 0 && new Date(`${invoice.closingDate}T00:00:00`) <= new Date() && <Pressable accessibilityRole="button" accessibilityLabel="Pagar fatura" onPress={() => setPaymentVisible(true)} style={s.payButton}><Text style={s.payText}>Marcar como paga</Text></Pressable>}<Text accessibilityRole="header" style={[s.sectionTitle, s.transactionsTitle]}>Compras da fatura</Text></> : <Feedback empty="Este cartão ainda não tem faturas. Elas aparecerão ao registrar compras no crédito." />}
    </>}
  </>;
  return <View style={s.root}>
    {card && invoice ? <InvoiceStatement key={`${invoice.uuid}-${revision}-${paymentRevision}`} cardUuid={card.uuid} invoiceUuid={invoice.uuid} accessToken={accessToken} header={top} /> : <ScrollView contentContainerStyle={s.content}>{top}{!card && <Feedback loading={loading} error={error} onRetry={retry} />}</ScrollView>}
    {paymentVisible && invoice && <InvoicePaymentDrawer invoice={invoice} accessToken={accessToken} onClose={() => setPaymentVisible(false)} onPaid={() => { setPaymentVisible(false); setPaymentRevision(value => value + 1); retry(); onPayment?.(); }} />}
    <Modal visible={allVisible} transparent animationType="slide" onRequestClose={() => setAllVisible(false)}>
      <View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fechar lista de faturas" onPress={() => setAllVisible(false)} /><View style={s.drawer}><View style={s.section}><Text style={s.sectionTitle}>Todas as faturas</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar faturas" onPress={() => setAllVisible(false)} style={s.action}><Icon name="close" size={24} /></Pressable></View><FlatList data={invoices} keyExtractor={item => item.uuid} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar fatura ${monthLabel(item.referenceMonth)}`} accessibilityState={{ selected: invoice?.uuid === item.uuid }} onPress={() => select(item.uuid)} style={s.invoiceRow}><View><Text style={s.rowTitle}>{monthLabel(item.referenceMonth)}</Text><Text style={s.muted}>{statuses[item.status]}</Text></View><Text style={s.rowAmount}>{formatCurrency(item.total)}</Text><Icon name={invoice?.uuid === item.uuid ? 'check' : 'chevron'} size={20} color="#0666FF" /></Pressable>} /></View></View>
    </Modal>
  </View>;
}

function InvoiceStatement({ cardUuid, invoiceUuid, accessToken, header }) {
  const endpoint = `/api/credit-card/${encodeURIComponent(cardUuid)}/invoices/${encodeURIComponent(invoiceUuid)}/transactions`;
  return <PagedTransactionList accessToken={accessToken} endpoint={endpoint} header={header} emptyMessage="Nenhuma transação nesta fatura." />;
}
const s = StyleSheet.create({
  payButton: { backgroundColor: '#0666FF', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 }, payText: { fontFamily, color: '#FFF', fontSize: 16, fontWeight: '600' },
  root: { flex: 1 }, content: { paddingHorizontal: 22, paddingBottom: 28 }, nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, navTitle: { fontFamily, fontSize: 18, fontWeight: '600', color: '#111310' }, identity: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 18, marginBottom: 24 }, identityText: { flex: 1, gap: 6 }, title: { fontFamily, fontSize: 23, fontWeight: '700', color: '#111310' }, muted: { fontFamily, fontSize: 13, lineHeight: 20, color: '#828388' }, panel: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 }, metrics: { flexDirection: 'row', gap: 14 }, metric: { flex: 1, gap: 5 }, verticalDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E4E4E6', paddingLeft: 14 }, value: { fontFamily, fontSize: 25, fontWeight: '700', color: '#111310', fontVariant: ['tabular-nums'] }, dates: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E6', marginTop: 18, paddingTop: 14 }, date: { fontFamily, fontSize: 13, color: '#525867' }, section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }, sectionTitle: { fontFamily, fontSize: 19, fontWeight: '700', color: '#111310' }, action: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' }, link: { fontFamily, fontSize: 14, color: '#0666FF', fontWeight: '600' }, months: { gap: 10, paddingBottom: 18 }, month: { width: 116, minHeight: 65, borderRadius: 15, borderWidth: 1, borderColor: '#DCDDE2', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 4 }, monthText: { fontFamily, fontSize: 15, fontWeight: '600', color: '#111310' }, status: { fontFamily, fontSize: 12, color: '#828388' }, selected: { backgroundColor: '#0666FF', borderColor: '#0666FF' }, white: { color: '#FFF' }, green: { color: '#116B34' }, negative: { color: '#B33D39' }, pressed: { opacity: 0.7 }, invoiceTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, pill: { fontFamily, fontSize: 11, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 }, paid: { backgroundColor: '#E4F4E8', color: '#116B34' }, closed: { backgroundColor: '#FFF0C2', color: '#88641D' }, open: { backgroundColor: '#EAF1FF', color: '#0666FF' }, invoiceTotal: { fontFamily, fontSize: 34, fontWeight: '700', color: '#111310', marginVertical: 12, fontVariant: ['tabular-nums'] }, invoiceDates: { flexDirection: 'row', gap: 16 }, transactionsTitle: { marginTop: 26, marginBottom: 6 }, day: { fontFamily, fontSize: 12, fontWeight: '600', color: '#828388', marginTop: 16, marginBottom: 8 }, transaction: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E4E6' }, tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, minWidth: 0, gap: 4 }, rowTitle: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111310' }, rowDetail: { fontFamily, fontSize: 11, lineHeight: 16, color: '#828388' }, rowAmount: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111310', fontVariant: ['tabular-nums'] }, feedback: { alignItems: 'center', paddingVertical: 30, gap: 12 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }, drawer: { backgroundColor: '#F5F3ED', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 32, maxHeight: '75%' }, invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCDDE2' },
});
