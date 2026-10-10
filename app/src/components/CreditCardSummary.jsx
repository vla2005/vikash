import { creditCardLabel } from '../utils/creditCards';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import { formatInvoiceDate } from './CreditCardInvoiceDrawer';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily, fontFamilyBold } from '../theme';

export default function CreditCardSummary({ card, onInvoice }) {
  const invoice = card.currentInvoice;
  const used = card.creditLimit > 0 ? Math.min(1, Math.max(0, (card.creditLimit - card.availableLimit) / card.creditLimit)) : 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir cartão ${creditCardLabel(card)}`} onPress={onInvoice} style={({ pressed }) => [s.card, pressed && s.pressed]}>
    <View style={s.header}><InstitutionLogo institution={card.financialInstitution} size={32} backgroundColor={colors.surfaceMuted} /><Text style={s.name}>{creditCardLabel(card)}</Text><Icon name="chevron" size={19} color={colors.text} /></View>
    {card.creditLimit > 0 && <View accessibilityRole="progressbar" accessibilityLabel={`Limite utilizado de ${creditCardLabel(card)}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(used * 100) }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} style={s.track}><View style={[s.progress, { width: `${used * 100}%` }]} /></View>}
    <View style={s.metrics}>
      <View style={s.metric}><Text style={s.label}>Fatura atual</Text><Text accessibilityLabel={`Fatura de ${creditCardLabel(card)}`} numberOfLines={1} adjustsFontSizeToFit style={s.value}>{formatCurrency(invoice?.total ?? 0)}</Text><Text style={s.small}>{invoice ? `Vence em ${formatInvoiceDate(invoice.dueDate)}` : 'Nenhuma fatura em aberto'}</Text></View>
      <View style={[s.metric, s.divider]}><Text style={s.label}>Limite disponível</Text><Text accessibilityLabel={`Limite disponível de ${creditCardLabel(card)}`} numberOfLines={1} adjustsFontSizeToFit style={[s.value, s.available, card.availableLimit < 0 && s.negative]}>{formatCurrency(card.availableLimit)}</Text>{card.creditLimit > 0 && <Text style={s.small}>de {formatCurrency(card.creditLimit)}</Text>}</View>
    </View>
    <View style={s.footer}><Icon name="statement" size={22} color={colors.text} /><Text style={s.link}>{invoice ? 'Ver fatura' : 'Ver cartão'}</Text><Icon name="chevron" size={17} color={colors.secondary} /></View>
  </Pressable>;
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.surfaceMuted, borderRadius: 18, padding: 12, marginTop: 4, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  name: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  metrics: { flexDirection: 'row', paddingVertical: 9 }, metric: { flex: 1, gap: 3 },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, paddingLeft: 14 },
  label: { fontFamily, fontSize: 12, lineHeight: 16, color: colors.secondary },
  value: { fontFamily: fontFamilyBold, fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  available: { color: colors.primary }, negative: { color: colors.negative },
  small: { fontFamily, fontSize: 11, lineHeight: 15, color: colors.secondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, minHeight: 44, paddingTop: 10 },
  link: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
