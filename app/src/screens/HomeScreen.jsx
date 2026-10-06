import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import useDashboard from '../hooks/useDashboard';
import BalanceEvolutionChart from '../components/BalanceEvolutionChart';
import HomeAccountsAndCards from '../components/HomeAccountsAndCards';
import CategoryExpensesChart from '../components/CategoryExpensesChart';
import RecentTransactions from '../components/RecentTransactions';
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
  const name = profile?.name?.trim().split(/\s+/)[0];
  const greeting = hour < 6 ? 'Boa madrugada' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const amount = value => value == null ? '—' : formatCurrency(value);

  function chooseMonth(month) {
    setPeriod({ year: pickerYear, month });
    setPickerOpen(false);
  }

  return <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <BrandLogo width={126} />
      <Text style={s.greeting}>{greeting}{name ? <Text style={s.name}>, {name}</Text> : ''}</Text>
      <View style={s.balanceSection}>
        <View style={s.balanceCopy}>
          <Text style={s.label}>Saldo total</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={s.balance}>{hidden ? '••••••' : amount(data?.totalBalance)}</Text>
          <Text style={s.caption}>Em todas as suas contas</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar saldo total' : 'Ocultar saldo total'}
          onPress={() => setHidden(value => !value)} style={({ pressed }) => [s.visibility, pressed && s.pressed]}>
          <Icon name={hidden ? 'eyeOff' : 'eye'} size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={s.summary}>
        <View style={s.metric}><Text style={s.label}>Entradas</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, s.incomes]}>{amount(data?.incomes)}</Text></View>
        <View style={[s.metric, s.divider]}><Text style={s.label}>Saídas</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, s.expenses]}>{amount(data?.expenses)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Selecionar mês e ano" onPress={() => { setPickerYear(period.year); setPickerOpen(true); }}
          style={({ pressed }) => [s.period, pressed && s.pressed]}>
          <View><Text style={s.month}>{months[period.month - 1]}</Text><Text style={s.year}>{period.year}</Text></View>
          <Icon name="chevronDown" size={14} color={colors.text} />
        </Pressable>
      </View>
      {!!data && !loading && !error && (data.incomesPercentageChange != null || data.expensesPercentageChange != null) && <View style={s.comparisons}>
        {data.incomesPercentageChange != null && <ComparisonCard label="entradas" percentage={data.incomesPercentageChange} period={period} />}
        {data.expensesPercentageChange != null && <ComparisonCard label="saídas" percentage={data.expensesPercentageChange} period={period} />}
      </View>}
      {!!data && !loading && !error && <>
        <BalanceEvolutionChart points={data.balanceEvolution} />
        <CategoryExpensesChart categories={data.expensesPerCategory} periodLabel={`${months[period.month - 1]} de ${period.year}`} />
        <HomeAccountsAndCards accounts={data.accounts ?? []} cards={data.creditCards ?? []} profile={profile}
          onOpenAccount={onOpenAccount} onOpenCard={onOpenCard} onViewAll={onViewCards} />
        <RecentTransactions rows={data.recentTransactions} onOpenTransaction={onOpenTransaction} onViewStatement={onViewStatement} />
      </>}
      {loading && <View style={s.feedback}><ActivityIndicator color={colors.primary} size="small" /><Text style={s.caption}>Carregando resumo…</Text></View>}
      {!!error && <View style={s.errorBox}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar resumo novamente" onPress={retry} style={s.retry}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
    </ScrollView>
    <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
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
          <Text style={s.pickerNote}>Entradas, saídas e gastos por categoria do mês selecionado.</Text>
        </View>
      </View>
    </Modal>
  </>;
}

function ComparisonCard({ label, percentage, period }) {
  const neutral = percentage == null || percentage === 0;
  const favorable = label === 'entradas' ? percentage > 0 : percentage < 0;
  const tone = neutral ? s.comparisonNeutral : favorable ? s.comparisonPositive : s.comparisonNegative;
  const color = neutral ? colors.secondary : favorable ? colors.positive : colors.negative;
  const today = new Date();
  const isCurrent = period.year === today.getFullYear() && period.month === today.getMonth() + 1;
  const caption = isCurrent ? `Comparando até o dia ${today.getDate()}` : 'Mês completo · mês anterior';
  const formatted = percentage == null ? '' : Math.abs(percentage).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const title = percentage == null ? 'Sem base de comparação'
    : percentage === 0 ? `${label === 'entradas' ? 'Entradas' : 'Saídas'} sem variação`
      : `${formatted}% ${percentage > 0 ? 'mais' : 'menos'} ${label}`;
  return <View style={[s.comparison, tone]}>
    <View style={s.comparisonHeading}>
      <View style={[s.trendIcon, tone]}><Icon name={neutral ? 'arrow' : percentage > 0 ? 'trendUp' : 'trendDown'} size={18} color={color} /></View>
      <Text style={[s.comparisonTitle, { color }]}>{title}</Text>
    </View>
    <Text style={s.comparisonCaption}>{caption}</Text>
    {isCurrent && <Text style={s.comparisonCaption}>Em relação ao mês anterior</Text>}
  </View>;
}

const s = StyleSheet.create({
  content: { padding: 22, paddingBottom: 28 },
  greeting: { fontFamily, fontSize: 18, lineHeight: 27, color: colors.text, marginTop: 28 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700' },
  balanceSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 24 },
  balanceCopy: { flex: 1 }, label: { fontFamily, fontSize: 11, lineHeight: 17, color: colors.secondary },
  balance: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 37, lineHeight: 49, letterSpacing: -1.6, color: colors.text },
  caption: { fontFamily, fontSize: 11, lineHeight: 18, color: colors.secondary },
  visibility: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  summary: { padding: 14, borderRadius: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  comparisons: { flexDirection: 'row', gap: 10, marginTop: 12 }, comparison: { flex: 1, minWidth: 0, borderRadius: 18, padding: 12 },
  comparisonPositive: { backgroundColor: '#EDF8F3' }, comparisonNegative: { backgroundColor: '#FCF0F0' }, comparisonNeutral: { backgroundColor: colors.surfaceMuted },
  comparisonHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }, trendIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  comparisonTitle: { flex: 1, fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 12, lineHeight: 18 }, comparisonCaption: { fontFamily, fontSize: 10, lineHeight: 15, color: colors.secondary },
  metric: { flex: 1, minWidth: 0 }, divider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 12 },
  total: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 15, lineHeight: 23 }, incomes: { color: colors.positive }, expenses: { color: colors.negative },
  period: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 6 },
  month: { fontFamily: fontFamilyMedium, fontSize: 11, color: colors.text }, year: { fontFamily, fontSize: 10, color: colors.secondary, marginTop: 2 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }, errorBox: { marginTop: 16, backgroundColor: colors.errorSoft, borderRadius: 16, padding: 14 },
  error: { fontFamily, color: colors.error, fontSize: 13, lineHeight: 20 }, retry: { paddingVertical: 12 }, link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 13 },
  pressed: { opacity: 0.7 }, overlay: { flex: 1, backgroundColor: colors.dialogBackdrop, alignItems: 'center', justifyContent: 'center', padding: 22 },
  picker: { width: '100%', maxWidth: 360, padding: 22, borderRadius: 28, backgroundColor: colors.surface },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerTitle: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 20, color: colors.text },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  pickerYear: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 24, color: colors.text }, months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthOption: { width: '30%', flexGrow: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  selectedMonth: { backgroundColor: colors.primary }, optionText: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.text }, selectedText: { color: colors.surface },
  pickerNote: { fontFamily, fontSize: 12, color: colors.secondary, textAlign: 'center', marginTop: 20 },
});
