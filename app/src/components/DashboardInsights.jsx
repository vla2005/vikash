import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import Skeleton from './Skeleton';
import useDashboard from '../hooks/useDashboard';
import { previousPeriod, spendingPace, hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function DashboardInsights({ data, period, invoices = [], hidden, accessToken, revision, onOpenCard }) {
  const previous = previousPeriod(period);
  const hasPrevious = previous.year >= 1900;
  const comparison = useDashboard(previous.year, previous.month, hasPrevious ? accessToken : null, revision);
  const pace = spendingPace(data.expenses, period);
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const dueInvoice = [...invoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const dueInDays = dueInvoice ? Math.round((Date.parse(dueInvoice.dueDate + 'T00:00:00Z') - Date.parse(todayKey + 'T00:00:00Z')) / 86400000) : null;
  const highLimit = (data.creditCards ?? []).filter(card => card.creditLimit > 0)
    .map(card => ({ ...card, used: Math.max(0, card.creditLimit - card.availableLimit) / card.creditLimit * 100 }))
    .sort((a, b) => b.used - a.used)[0];
  const money = value => hidden ? hiddenAmount : formatCurrency(value);
  const delta = comparison.data ? data.expenses - comparison.data.expenses : null;
  return <View style={s.section}>
    <Text accessibilityRole="header" style={s.title}>De olho no mês</Text>
    <View style={s.panel}>
      {dueInvoice && dueInDays <= 7 && <Pressable accessibilityRole="button" accessibilityLabel="Abrir próxima fatura"
        onPress={() => onOpenCard?.(dueInvoice.creditCard.uuid, dueInvoice.uuid)} style={({ pressed }) => [s.notice, pressed && s.pressed]}>
        <Icon name="warning" size={20} color={dueInDays < 0 ? colors.negative : colors.copper} />
        <View style={s.copy}><Text style={s.noticeTitle}>{dueInDays < 0 ? 'Fatura atrasada' : dueInDays === 0 ? 'Fatura vence hoje' : 'Fatura vence em breve'}</Text>
          <Text style={s.caption}>{dueInvoice.creditCard.description} · {money(dueInvoice.total)}</Text></View>
        <Icon name="chevron" size={16} color={colors.secondary} />
      </Pressable>}
      {highLimit?.used >= 80 && <View style={s.notice}>
        <Icon name="creditCard" size={20} color={colors.copper} /><View style={s.copy}>
          <Text style={s.noticeTitle}>Limite próximo do máximo</Text>
          <Text style={s.caption}>{highLimit.description} · {hidden ? hiddenAmount : `${Math.round(highLimit.used)}% utilizado`}</Text>
        </View>
      </View>}
      <View style={s.comparison}>
        <Text style={s.label}>Saídas das contas · mês anterior completo</Text>
        {!hasPrevious ? <Text style={s.caption}>Sem período anterior disponível.</Text> : comparison.loading ? <Skeleton width="75%" height={22} /> : comparison.error ? <Pressable
          accessibilityRole="button" accessibilityLabel="Tentar carregar comparação novamente" onPress={comparison.retry} style={s.retry}>
          <Text style={s.caption}>Comparação indisponível. Tentar novamente</Text>
        </Pressable> : delta != null && <Text style={[s.comparisonValue, !hidden && { color: delta > 0 ? colors.negative : delta < 0 ? colors.positive : colors.text }]}>
          {hidden ? hiddenAmount : delta === 0 ? 'Mesmo valor do mês anterior' : `${formatCurrency(Math.abs(delta))} a ${delta > 0 ? 'mais' : 'menos'}`}
        </Text>}
      </View>
      {pace && <View style={s.metrics}>
        <View style={s.copy}><Text style={s.label}>Média diária</Text><Text style={s.value}>{money(pace.daily)}</Text></View>
        {pace.projection != null && <View style={[s.copy, s.divider]}><Text style={s.label}>Projeção de saídas</Text><Text style={s.value}>{money(pace.projection)}</Text></View>}
      </View>}
      <Text style={s.caption}>{pace?.projection != null ? 'Saídas das contas. Estimativa pelo ritmo do mês, sem prever novas compras.' : 'Saídas das contas, incluindo pagamentos de faturas.'}</Text>
    </View>
  </View>;
}
const s = StyleSheet.create({
  section: { marginTop: 24 }, title: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text, marginBottom: 12 },
  panel: { borderRadius: 22, backgroundColor: colors.surface, padding: 18, gap: 16 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  copy: { flex: 1, minWidth: 0, gap: 4 }, noticeTitle: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  caption: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  label: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  comparison: { gap: 5 }, comparisonValue: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 17, lineHeight: 25, color: colors.text },
  metrics: { flexDirection: 'row', gap: 14 }, divider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  value: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  retry: { paddingVertical: 8 }, pressed: { opacity: 0.7 },
});
