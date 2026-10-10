import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import { ListSkeleton } from './Skeleton';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function PendingInvoices({ invoices = [], loading, error, onRetry, hidden, onOpenCard, onViewAll }) {
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Faturas a pagar</Text>
      {!!onViewAll && <Pressable accessibilityRole="button" accessibilityLabel="Ver todos os cartões" onPress={onViewAll} style={s.linkButton}><Text style={s.link}>Ver todas</Text></Pressable>}
    </View>
    <Text style={s.caption}>Pendentes atuais · atrasadas primeiro</Text>
    {loading ? <ListSkeleton label="Carregando faturas" count={3} /> : error ? <View style={s.panel}>
      <Text accessibilityRole="alert" style={s.caption}>{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar crédito novamente" onPress={onRetry} style={s.linkButton}><Text style={s.link}>Tentar novamente</Text></Pressable>
    </View> : <View style={s.panel}>
      {invoices.length ? invoices.slice(0, 3).map((invoice, index) => {
        const overdue = invoice.dueDate < todayKey;
        const dueDate = new Date(invoice.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
        return <Pressable key={invoice.uuid} accessibilityRole="button" accessibilityLabel={`Abrir fatura de ${invoice.creditCard.description}, vencimento ${invoice.dueDate}`}
          onPress={() => onOpenCard?.(invoice.creditCard.uuid, invoice.uuid)} style={({ pressed }) => [s.row, index > 0 && s.divider, pressed && s.pressed]}>
          <InstitutionLogo institution={invoice.creditCard.financialInstitution} size={36} />
          <View style={s.copy}><Text numberOfLines={2} style={s.name}>{invoice.creditCard.description}</Text>
            <Text style={[s.caption, overdue && s.overdue]}>{overdue ? 'Atrasada · ' : invoice.dueDate === todayKey ? 'Vence hoje · ' : 'Vence '}{dueDate}</Text></View>
          <Text style={s.amount}>{hidden ? hiddenAmount : formatCurrency(invoice.total)}</Text>
          <Icon name="chevron" size={16} color={colors.secondary} />
        </Pressable>;
      }) : <View style={s.empty}><Icon name="check" size={22} color={colors.positive} /><Text style={s.caption}>Nenhuma fatura pendente nos seus cartões.</Text></View>}
    </View>}
  </View>;
}
const s = StyleSheet.create({
  section: { marginTop: 24 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  linkButton: { minHeight: 44, justifyContent: 'center' }, link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
  caption: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  panel: { backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 16, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 80, paddingVertical: 16 },
  copy: { flex: 1, minWidth: 0, gap: 4 }, name: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  amount: { maxWidth: '35%', flexShrink: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 14, lineHeight: 21, color: colors.text },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, overdue: { color: colors.negative },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 }, pressed: { opacity: 0.7 },
});
