import React, { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Skeleton, { DashboardSkeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import useDashboard from '../hooks/useDashboard';
import HomeAccountsAndCards from '../components/HomeAccountsAndCards';
import CategoryExpensesChart from '../components/CategoryExpensesChart';
import BalanceEvolutionChart from '../components/BalanceEvolutionChart';
import RecentTransactions from '../components/RecentTransactions';
import DashboardInsights from '../components/DashboardInsights';
import PendingInvoices from '../components/PendingInvoices';
import useCreditDashboard from '../hooks/useCreditDashboard';
import useReducedMotion from '../hooks/useReducedMotion';
import { hiddenAmount, toRecentPurchaseRows, shiftPeriod } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily, fontFamilyBold } from '../theme';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function HomeScreen({ profile, accessToken, revision, onOpenAccount, onOpenCard, onViewCards, onOpenTransaction, onViewStatement }) {
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.year);
  const [hidden, setHidden] = useState(false);
  const [scope, setScope] = useState('accounts');
  const reduced = useReducedMotion();
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const updateHour = () => setHour(new Date().getHours());
    const timer = setInterval(updateHour, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { updateHour(); }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const { data, loading, error, retry } = useDashboard(period.year, period.month, accessToken, revision);
  const credit = useCreditDashboard(period.year, period.month, null, accessToken, revision);
  const name = profile?.name?.trim().split(/\s+/)[0];
  const greeting = hour < 6 ? 'Boa madrugada' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const amount = value => hidden ? hiddenAmount : value == null ? '—' : formatCurrency(value);
  const recentPurchases = toRecentPurchaseRows(credit.data?.recentPurchases);

  function chooseMonth(month) {
    setPeriod({ year: pickerYear, month });
    setPickerOpen(false);
  }

  return <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.topRow}>
        <Text style={[s.greeting, s.balanceCopy]}>{greeting}{name ? <Text style={s.name}>, {name}</Text> : ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          onPress={() => setHidden(value => !value)} style={({ pressed }) => [s.visibility, pressed && s.pressed]}>
          <Icon name={hidden ? 'eyeOff' : 'eye'} size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={s.summaryCard}>
        <View style={s.balanceCopy}>
          <Text style={s.label}>Saldo total</Text>
          {loading && !hidden ? <Skeleton width="85%" height={49} /> : <Text numberOfLines={1} adjustsFontSizeToFit style={s.balance}>{amount(data?.totalBalance)}</Text>}
          <Text style={s.caption}>Saldo atual de todas as suas contas</Text>
        </View>
      <View style={s.monthlySummary}>
        <Text accessibilityRole="header" style={s.sectionTitle}>Resumo do mês</Text>
        <View style={s.monthNavigation}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={period.year === 1900 && period.month === 1}
            onPress={() => setPeriod(value => shiftPeriod(value, -1))} style={s.iconButton}><Icon name="back" size={20} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Selecionar mês e ano" onPress={() => { setPickerYear(period.year); setPickerOpen(true); }}
            style={({ pressed }) => [s.period, pressed && s.pressed]}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.month}>{months[period.month - 1]} de {period.year}</Text><Icon name="chevronDown" size={16} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" disabled={period.year === 9999 && period.month === 12}
            onPress={() => setPeriod(value => shiftPeriod(value, 1))} style={s.iconButton}><Icon name="chevron" size={20} /></Pressable>
        </View>
        <Text style={s.caption}>Este período vale para entradas, saídas e o gráfico de gastos abaixo.</Text>
      <View style={s.summary}>
        <View style={s.metric}><Text style={s.label}>Entradas</Text>{loading ? <Skeleton height={23} /> : <Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, s.incomes]}>{amount(data?.incomes)}</Text>}</View>
        <View style={[s.metric, s.divider]}><Text style={s.label}>Saídas</Text>{loading ? <Skeleton height={23} /> : <Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, s.expenses]}>{amount(data?.expenses)}</Text>}</View>
      </View>
      <View style={s.remaining}><Text style={s.label}>{data && data.incomes - data.expenses < 0 ? 'Faltou no mês' : 'Sobrou no mês'}</Text>
        {loading ? <Skeleton width={110} height={22} /> : <Text style={s.remainingValue}>{amount(data ? data.incomes - data.expenses : null)}</Text>}</View>
      </View>
      </View>
      {!!data && !loading && !error && <>
        <CategoryExpensesChart categories={data.expensesPerCategory} creditCategories={credit.data?.expensesPerCategory}
          periodLabel={`${months[period.month - 1]} de ${period.year}`} hidden={hidden} scope={scope} onChangeScope={setScope}
          creditLoading={credit.loading} creditError={credit.error} onRetryCredit={credit.retry} />
        <BalanceEvolutionChart points={data.balanceEvolution} hidden={hidden} />
        <DashboardInsights data={data} period={period} invoices={credit.data?.upcomingInvoices} hidden={hidden}
          accessToken={accessToken} revision={revision} onOpenCard={onOpenCard} />
        <PendingInvoices invoices={credit.data?.upcomingInvoices} loading={credit.loading} error={credit.error}
          onRetry={credit.retry} hidden={hidden} onOpenCard={onOpenCard} onViewAll={onViewCards} />
        <HomeAccountsAndCards accounts={data.accounts ?? []} cards={data.creditCards ?? []} profile={profile} hidden={hidden}
          onOpenAccount={onOpenAccount} onOpenCard={onOpenCard} onViewAll={onViewCards} />
        <RecentTransactions rows={data.recentTransactions} creditRows={recentPurchases} hidden={hidden}
          onOpenTransaction={onOpenTransaction} onViewStatement={onViewStatement} onViewCards={onViewCards}
          creditLoading={credit.loading} creditError={credit.error} onRetryCredit={credit.retry} />
      </>}
      {loading && <DashboardSkeleton />}
      {!!error && <View style={s.errorBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar resumo novamente" onPress={retry} style={s.retry}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
    </ScrollView>
    <Modal visible={pickerOpen} transparent animationType={reduced ? 'none' : 'fade'} statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fechar seletor de período" onPress={() => setPickerOpen(false)} />
        <View style={s.picker} accessibilityViewIsModal>
          <View style={s.pickerHeader}><Text accessibilityRole="header" style={s.pickerTitle}>Escolha o período</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar período" onPress={() => setPickerOpen(false)} style={s.iconButton}><Icon name="close" size={20} /></Pressable></View>
          <View style={s.yearSelector}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ano anterior" disabled={pickerYear <= 1900} onPress={() => setPickerYear(value => value - 1)} style={s.iconButton}><Icon name="back" size={20} /></Pressable>
            <Text style={s.pickerYear}>{pickerYear}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo ano" disabled={pickerYear >= 9999} onPress={() => setPickerYear(value => value + 1)} style={s.iconButton}><Icon name="chevron" size={20} /></Pressable>
          </View>
          <View style={s.months}>{months.map((month, index) => {
            const selected = period.year === pickerYear && period.month === index + 1;
            return <Pressable key={month} accessibilityRole="button" accessibilityLabel={`${month} de ${pickerYear}`} accessibilityState={{ selected }}
              onPress={() => chooseMonth(index + 1)} style={({ pressed }) => [s.monthOption, selected && s.selectedMonth, pressed && s.pressed]}>
              <Text style={[s.optionText, selected && s.selectedText]}>{month.slice(0, 3)}</Text>
            </Pressable>;
          })}</View>
          <Text style={s.pickerNote}>Entradas, saídas, categorias e compras no crédito do mês selecionado.</Text>
        </View>
      </View>
    </Modal>
  </>;
}


const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  greeting: { fontFamily, fontSize: 18, lineHeight: 27, color: colors.text, marginTop: 12 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 15 },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 20, marginTop: 16 },
  monthlySummary: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 18, gap: 12 },
  sectionTitle: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  balanceCopy: { flex: 1 }, label: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  balance: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 37, lineHeight: 49, letterSpacing: -1.6, color: colors.text },
  caption: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  visibility: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  remaining: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.primarySoft, padding: 14, borderRadius: 14 },
  remainingValue: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 17, lineHeight: 25, color: colors.text },
  metric: { flex: 1, minWidth: 0 }, divider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 12 },
  total: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 21, lineHeight: 31 }, incomes: { color: colors.positive }, expenses: { color: colors.negative },
  period: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  month: { flexShrink: 1, fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 23, color: colors.text },
  errorBox: { marginTop: 16, backgroundColor: colors.errorSoft, borderRadius: 16, padding: 14 },
  error: { fontFamily, color: colors.error, fontSize: 13, lineHeight: 20 }, retry: { paddingVertical: 12 }, link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 13 },
  pressed: { opacity: 0.7 }, overlay: { flex: 1, backgroundColor: colors.dialogBackdrop, alignItems: 'center', justifyContent: 'center', padding: 22 },
  picker: { width: '100%', maxWidth: 360, padding: 22, borderRadius: 28, backgroundColor: colors.surface },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerTitle: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 20, color: colors.text },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  pickerYear: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 24, color: colors.text }, months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthOption: { width: '30%', flexGrow: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  selectedMonth: { backgroundColor: colors.primary }, optionText: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.text }, selectedText: { color: colors.surface },
  pickerNote: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, textAlign: 'center', marginTop: 20 },
});
