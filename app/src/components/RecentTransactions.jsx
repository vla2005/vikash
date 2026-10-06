import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CategoryIcon from './CategoryIcon';
import Icon from './Icon';
import { categoryColors } from '../data/categories';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function dateLabel(date) {
  const [year, month, day] = date.split('-').map(Number);
  const today = new Date();
  const daysAgo = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(year, month - 1, day)) / 86400000;
  if (daysAgo === 0) { return 'Hoje'; }
  if (daysAgo === 1) { return 'Ontem'; }
  return `${day} ${months[month - 1]}${year !== today.getFullYear() ? ` ${year}` : ''}`;
}

export default function RecentTransactions({ rows = [], onOpenTransaction, onViewStatement }) {
  return <View style={s.card}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Movimentações recentes</Text>
      {!!onViewStatement && <Pressable accessibilityRole="button" accessibilityLabel="Ver extrato" onPress={onViewStatement}
        style={({ pressed }) => [s.linkButton, pressed && s.pressed]}><Text style={s.link}>Ver extrato</Text><Icon name="chevron" size={14} color={colors.primary} /></Pressable>}
    </View>
    {rows.length ? rows.map((row, index) => {
      const palette = categoryColors.find(color => color.key === row.color) ?? categoryColors.find(color => color.key === 'gray');
      const income = row.type === 'INCOME';
      const expense = ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type);
      const sign = income ? '+ ' : expense ? '− ' : '';
      const details = [dateLabel(row.date), row.account === 'Carteira' && row.payment === 'Dinheiro' ? null : row.payment, row.account].filter(Boolean).join(' · ');
      return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Abrir lançamento ${row.description}`}
        accessibilityState={{ disabled: !onOpenTransaction }} disabled={!onOpenTransaction} onPress={() => onOpenTransaction(row)}
        style={({ pressed }) => [s.row, index > 0 && s.divider, pressed && s.pressed]}>
        <View style={[s.icon, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} size={21} color={palette.foreground} /></View>
        <View style={s.copy}><Text numberOfLines={2} style={s.name}>{row.description}</Text><Text style={s.detail}>{details}</Text></View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[s.amount, income && s.income, expense && s.expense]}>{`${sign}${formatCurrency(row.amount)}`}</Text>
      </Pressable>;
    }) : <Text style={s.empty}>Suas últimas movimentações aparecerão aqui.</Text>}
  </View>;
}

const s = StyleSheet.create({
  card: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 14, lineHeight: 20, color: colors.text },
  linkButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontFamily: fontFamilyMedium, fontSize: 11, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 12, lineHeight: 18, color: colors.text },
  detail: { fontFamily, fontSize: 10, lineHeight: 15, color: colors.secondary },
  amount: { maxWidth: '39%', fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 13, color: colors.primary, fontVariant: ['tabular-nums'] },
  income: { color: colors.positive }, expense: { color: colors.negative },
  empty: { fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary, paddingVertical: 20 },
  pressed: { opacity: 0.7 },
});
