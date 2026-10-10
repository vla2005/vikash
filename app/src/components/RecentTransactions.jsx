import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CategoryIcon from './CategoryIcon';
import Icon from './Icon';
import SegmentedControl from './SegmentedControl';
import { ListSkeleton } from './Skeleton';
import { hiddenAmount } from '../utils/dashboard';
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

export default function RecentTransactions({ rows = [], creditRows = [], onOpenTransaction, onViewStatement, onViewCards, hidden = false, creditLoading, creditError, onRetryCredit }) {
  const [scope, setScope] = useState('accounts');
  const isCredit = scope === 'credit';
  const visibleRows = (isCredit ? creditRows : rows).slice(0, 5);
  const loading = isCredit && creditLoading;
  const error = isCredit && creditError;
  const onViewAll = isCredit ? onViewCards : onViewStatement;
  const linkLabel = isCredit ? 'Ver cartões' : 'Ver extrato';
  return <View style={s.card}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Movimentações recentes</Text>
      {!!onViewAll && <Pressable accessibilityRole="button" accessibilityLabel={linkLabel} onPress={onViewAll}
        style={({ pressed }) => [s.linkButton, pressed && s.pressed]}><Text style={s.link}>{linkLabel}</Text><Icon name="chevron" size={14} color={colors.primary} /></Pressable>}
    </View>
    <SegmentedControl style={s.tabs} value={scope} onChange={setScope}
      options={[{ value: 'accounts', label: 'Contas', accessibilityLabel: 'Mostrar transações recentes das contas' },
        { value: 'credit', label: 'Crédito', accessibilityLabel: 'Mostrar compras recentes no crédito' }]} />
    {loading ? <ListSkeleton label="Carregando compras recentes" count={5} /> : error ? <View style={s.feedback}>
      <Text accessibilityRole="alert" style={s.detail}>Não foi possível carregar as compras no crédito.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar compras recentes" onPress={onRetryCredit} style={s.linkButton}>
        <Text style={s.link}>Tentar novamente</Text>
      </Pressable>
    </View> : visibleRows.length ? visibleRows.map((row, index) => {
      const palette = categoryColors.find(color => color.key === row.color) ?? categoryColors.find(color => color.key === 'gray');
      const income = row.type === 'INCOME';
      const expense = ['EXPENSE', 'INVOICE_PAYMENT', 'CREDIT_PURCHASE'].includes(row.type);
      const sign = income ? '+ ' : expense ? '− ' : '';
      const details = [dateLabel(row.date), row.account === 'Carteira' && row.payment === 'Dinheiro' ? null : row.payment, row.account].filter(Boolean).join(' · ');
      return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Abrir lançamento ${row.description}`}
        onPress={() => onOpenTransaction?.(row)} style={({ pressed }) => [s.row, index > 0 && s.divider, pressed && s.pressed]}>
        <View style={[s.icon, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} size={21} color={palette.foreground} /></View>
        <View style={s.copy}><Text numberOfLines={2} style={s.name}>{row.description}</Text><Text style={s.detail}>{details}</Text>
          {row.type === 'CREDIT_PURCHASE' && row.installmentCount > 1 && <Text style={s.detail}>{row.installmentCount} parcelas · valor integral</Text>}
        </View>
        <Text style={[s.amount, !hidden && income && s.income, !hidden && expense && s.expense]}>{hidden ? hiddenAmount : `${sign}${formatCurrency(row.amount)}`}</Text>
      </Pressable>;
    }) : <Text style={s.empty}>{isCredit ? 'Suas últimas compras no crédito aparecerão aqui.' : 'Suas últimas transações das contas aparecerão aqui.'}</Text>}
  </View>;
}

const s = StyleSheet.create({
  card: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  linkButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
  tabs: { width: 176, marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
  feedback: { paddingHorizontal: 14, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 14, lineHeight: 21, color: colors.text },
  detail: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  amount: { maxWidth: '39%', flexShrink: 1, fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 14, lineHeight: 21, color: colors.primary, fontVariant: ['tabular-nums'] },
  income: { color: colors.positive }, expense: { color: colors.negative },
  empty: { fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary, paddingVertical: 20, paddingHorizontal: 14 },
  pressed: { opacity: 0.7 },
});
