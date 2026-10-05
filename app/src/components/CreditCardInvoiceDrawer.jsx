import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily } from '../theme';

export function formatInvoiceDate(value) {
  if (!value) { return '—'; }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export default function CreditCardInvoiceDrawer({ card, onClose }) {
  const insets = useSafeAreaInsets();
  const invoice = card?.currentInvoice;
  const statusLabels = { OPEN: 'Aberta', CLOSED: 'Fechada', PAID: 'Paga' };
  return <Modal visible={!!card && !!invoice} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fechar fatura" onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24), marginTop: insets.top + 24 }]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Fatura do cartão</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes da fatura" onPress={onClose} hitSlop={12}><Icon name="close" /></Pressable></View>
          <View style={styles.bank}><InstitutionLogo institution={card?.financialInstitution} size={44} /><View style={styles.info}><Text style={styles.name}>{card?.description}</Text><Text style={styles.label}>{invoice?.referenceMonth?.split('-').reverse().join('/')}</Text></View><Text style={styles.badge}>{statusLabels[invoice?.status] || invoice?.status}</Text></View>
          <Text style={styles.label}>Total da fatura</Text><Text style={styles.amount}>{invoice && formatCurrency(invoice.total)}</Text>
          {[['Fechamento', formatInvoiceDate(invoice?.closingDate)], ['Vencimento', formatInvoiceDate(invoice?.dueDate)], ['Limite total', card ? formatCurrency(card.creditLimit) : '—'], ['Limite disponível', card ? formatCurrency(card.availableLimit) : '—']].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', maxWidth: 460, maxHeight: '85%', paddingHorizontal: 24, paddingTop: 12 }, handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 26 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { fontFamily, fontSize: 25, fontWeight: '700', color: colors.text }, bank: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 28 }, info: { flex: 1, gap: 5 }, name: { fontFamily, fontSize: 17, fontWeight: '600', color: colors.text }, label: { fontFamily, fontSize: 14, color: colors.secondary }, badge: { fontFamily, fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }, amount: { fontFamily, fontSize: 38, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 24 }, row: { minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, value: { fontFamily, fontSize: 14, fontWeight: '500', color: colors.text },
});
