import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import { formatInvoiceDate } from './CreditCardInvoiceDrawer';
import { formatCurrency } from '../utils/money';
import { fontFamily } from '../theme';

export default function CreditCardSummary({ card, onInvoice }) {
  const invoice = card.currentInvoice;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir cartão ${card.description}`} onPress={onInvoice} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.header}><InstitutionLogo institution={card.financialInstitution} size={46} /><View style={styles.info}><Text style={styles.name}>{card.description}</Text><Text style={styles.label}>{card.financialInstitution?.name || 'Cartão de crédito'}</Text></View></View>
    <View style={styles.metrics}><View style={styles.metric}><Text style={styles.label}>Fatura atual</Text><Text accessibilityLabel={`Fatura de ${card.description}`} style={styles.value}>{formatCurrency(invoice?.total ?? 0)}</Text></View><View style={[styles.metric, styles.divider]}><Text style={styles.label}>Limite disponível</Text><Text accessibilityLabel={`Limite disponível de ${card.description}`} style={[styles.value, card.availableLimit < 0 && styles.negative]}>{formatCurrency(card.availableLimit)}</Text></View></View>
    <View style={styles.footer}><Text style={styles.due}>{invoice ? `Vencimento: ${formatInvoiceDate(invoice.dueDate)}` : 'Nenhuma fatura em aberto'}</Text><View style={styles.link}><Text style={styles.linkText}>{invoice ? 'Ver fatura' : 'Ver cartão'}</Text><Icon name="chevron" size={18} color="#0666FF" /></View></View>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, marginTop: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 }, info: { flex: 1, gap: 5 }, name: { fontFamily, fontSize: 17, fontWeight: '600', color: '#111310' }, label: { fontFamily, fontSize: 13, color: '#828388' }, metrics: { flexDirection: 'row', paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E6' }, metric: { flex: 1, gap: 7 }, divider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E4E4E6', paddingLeft: 16 }, value: { fontFamily, fontSize: 20, fontWeight: '700', color: '#111310', fontVariant: ['tabular-nums'] }, negative: { color: '#B33D39' }, footer: { minHeight: 54, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E6', paddingVertical: 8 }, due: { fontFamily, fontSize: 12, color: '#828388' }, link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, linkText: { fontFamily, fontSize: 14, color: '#0666FF', fontWeight: '600' }, pressed: { opacity: 0.7 } });
