import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import GlassPanel from '../components/silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import ScrollView from '../components/silver/DockScrollView';
import Skeleton, { DashboardSkeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import useDashboard from '../hooks/useDashboard';
import HomeAccountsAndCards from '../components/HomeAccountsAndCards';
import DashboardExpensesChart from '../components/DashboardExpensesChart';
import BalanceEvolutionChart from '../components/BalanceEvolutionChart';
import RecentTransactions from '../components/RecentTransactions';
import DashboardInsights from '../components/DashboardInsights';
import PendingInvoices from '../components/PendingInvoices';
import BalanceCard from '../components/BalanceCard';
import FinancialMetric from '../components/FinancialMetric';
import {
  AnimatedPressable,
  AnimatedProgressBar,
  StaggeredSection,
} from '../components/motion/AnimatedPrimitives';
import useCreditDashboard from '../hooks/useCreditDashboard';
import useReducedMotion from '../hooks/useReducedMotion';
import {
  hiddenAmount,
  toRecentPurchaseRows,
  shiftPeriod,
} from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamily, fontFamilyBold } from '../theme';

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function HomeScreen({
  profile,
  accessToken,
  revision,
  onOpenAccount,
  onOpenCard,
  onViewCards,
  onOpenTransaction,
  onViewStatement,
}) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.year);
  const [hidden, setHidden] = useState(false);
  const [stackInteracting, setStackInteracting] = useState(false);
  const reduced = useReducedMotion();
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const updateHour = () => setHour(new Date().getHours());
    const timer = setInterval(updateHour, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        updateHour();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const { data, loading, error, retry } = useDashboard(
    period.year,
    period.month,
    accessToken,
    revision,
  );
  const credit = useCreditDashboard(
    period.year,
    period.month,
    null,
    accessToken,
    revision,
  );
  const name = profile?.name?.trim().split(/\s+/)[0];
  const greeting =
    hour < 6
      ? 'Boa madrugada'
      : hour < 12
      ? 'Bom dia'
      : hour < 18
      ? 'Boa tarde'
      : 'Boa noite';
  const amount = value =>
    hidden ? hiddenAmount : value == null ? '—' : formatCurrency(value);
  const recentPurchases = useMemo(
    () => toRecentPurchaseRows(credit.data?.recentPurchases),
    [credit.data?.recentPurchases],
  );

  function chooseMonth(month) {
    setPeriod({ year: pickerYear, month });
    setPickerOpen(false);
  }

  const net = data ? data.incomes - data.expenses : 0;
  const retentionRatio =
    data && data.incomes > 0
      ? Math.max(0, Math.min(1, (data.incomes - data.expenses) / data.incomes))
      : net >= 0
      ? 0.5
      : 0.1;
  const periodKey = `${period.year}-${period.month}`;

  return (
    <>
      <ScrollView
        testID="dashboard-scroll"
        scrollEnabled={!stackInteracting}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.topRow}>
          <View style={s.balanceCopy}>
            <Text style={s.greeting}>
              {greeting}
              {name ? <Text style={s.name}>, {name}</Text> : ''}
            </Text>
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
            scaleActive={0.9}
            onPress={() => setHidden(value => !value)}
            style={s.visibility}
          >
            <Icon
              name={hidden ? 'eyeOff' : 'eye'}
              size={20}
              color={hidden ? colors.primary : colors.text}
            />
          </AnimatedPressable>
        </View>

        <StaggeredSection index={0} triggerKey={periodKey} style={s.summaryCard}>
          <BalanceCard
            value={amount(data?.totalBalance)}
            caption="Saldo atual de todas as suas contas"
            loading={loading && !hidden}
          />

          <GlassPanel style={s.monthlySummary}>
            <View style={s.monthlyHeaderRow}>
              <View>
                <Text style={s.eyebrow}>FLUXO DE CAIXA</Text>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  Resumo do mês
                </Text>
              </View>
              <View style={s.monthNavigation}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mês anterior"
                  disabled={period.year === 1900 && period.month === 1}
                  onPress={() => setPeriod(value => shiftPeriod(value, -1))}
                  style={s.iconButton}
                >
                  <Icon name="back" size={18} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar mês e ano"
                  onPress={() => {
                    setPickerYear(period.year);
                    setPickerOpen(true);
                  }}
                  style={({ pressed }) => [s.period, pressed && s.pressed]}
                >
                  <Text style={s.month}>
                    {months[period.month - 1]} de {period.year}
                  </Text>
                  <Icon name="chevronDown" size={15} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Próximo mês"
                  disabled={period.year === 9999 && period.month === 12}
                  onPress={() => setPeriod(value => shiftPeriod(value, 1))}
                  style={s.iconButton}
                >
                  <Icon name="chevron" size={18} />
                </Pressable>
              </View>
            </View>

            <Text style={s.caption}>
              Este período vale para entradas, saídas e o gráfico de gastos
              abaixo.
            </Text>

            <View style={s.summary}>
              <FinancialMetric
                label="Entradas"
                value={amount(data?.incomes)}
                income
                loading={loading && !hidden}
              />
              <FinancialMetric
                label="Saídas"
                value={amount(data?.expenses)}
                loading={loading && !hidden}
              />
            </View>

            <View
              style={[
                s.remaining,
                !hidden &&
                  data && {
                    backgroundColor:
                      net < 0 ? colors.negativeSoft : colors.positiveSoft,
                    borderColor:
                      net < 0
                        ? 'rgba(244, 63, 94, 0.30)'
                        : 'rgba(16, 185, 129, 0.30)',
                  },
              ]}
            >
              <View style={s.remainingRow}>
                <Text
                  style={[
                    s.label,
                    !hidden &&
                      data && {
                        color: net < 0 ? colors.negative : colors.positive,
                        fontFamily: fontFamilyBold,
                        fontWeight: '700',
                      },
                  ]}
                >
                  {data && net < 0 ? 'Faltou no mês' : 'Sobrou no mês'}
                </Text>
                {loading && !hidden ? (
                  <Skeleton width={110} height={22} />
                ) : (
                  <Text
                    style={[
                      s.remainingValue,
                      !hidden &&
                        data && {
                          color: net < 0 ? colors.negative : colors.positive,
                        },
                    ]}
                  >
                    {amount(data ? net : null)}
                  </Text>
                )}
              </View>
              {!loading && data ? (
                <AnimatedProgressBar
                  progress={hidden ? 0.35 : retentionRatio}
                  color={net < 0 ? colors.negative : colors.positive}
                  trackColor="rgba(255, 255, 255, 0.08)"
                  height={5}
                />
              ) : null}
            </View>
          </GlassPanel>
        </StaggeredSection>

        <DashboardExpensesChart
          visible={!!data && !loading && !error}
          categories={data?.expensesPerCategory}
          creditCategories={credit.data?.expensesPerCategory}
          periodLabel={`${months[period.month - 1]} de ${period.year}`}
          hidden={hidden}
          creditLoading={credit.loading}
          creditError={credit.error}
          onRetryCredit={credit.retry}
        />

        {!!data && !loading && !error && (
          <>
            <StaggeredSection index={1} triggerKey={periodKey}>
              <BalanceEvolutionChart
                points={data.balanceEvolution}
                hidden={hidden}
              />
            </StaggeredSection>

            <StaggeredSection index={2} triggerKey={periodKey}>
              <DashboardInsights
                data={data}
                period={period}
                invoices={credit.data?.upcomingInvoices}
                hidden={hidden}
                accessToken={accessToken}
                revision={revision}
                onOpenCard={onOpenCard}
              />
            </StaggeredSection>

            <StaggeredSection index={3} triggerKey={periodKey}>
              <PendingInvoices
                invoices={credit.data?.upcomingInvoices}
                loading={credit.loading}
                error={credit.error}
                onRetry={credit.retry}
                hidden={hidden}
                onOpenCard={onOpenCard}
                onViewAll={onViewCards}
              />
            </StaggeredSection>

            <StaggeredSection index={4} triggerKey={periodKey}>
              <HomeAccountsAndCards
                accounts={data.accounts ?? []}
                cards={data.creditCards ?? []}
                profile={profile}
                hidden={hidden}
                onOpenAccount={onOpenAccount}
                onOpenCard={onOpenCard}
                onViewAll={onViewCards}
                onStackInteractionChange={setStackInteracting}
              />
            </StaggeredSection>

            <StaggeredSection index={5} triggerKey={periodKey}>
              <RecentTransactions
                rows={data.recentTransactions}
                creditRows={recentPurchases}
                hidden={hidden}
                onOpenTransaction={onOpenTransaction}
                onViewStatement={onViewStatement}
                onViewCards={onViewCards}
                creditLoading={credit.loading}
                creditError={credit.error}
                onRetryCredit={credit.retry}
              />
            </StaggeredSection>
          </>
        )}

        {loading && <DashboardSkeleton />}
        {!!error && (
          <View style={s.errorBox}>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar resumo novamente"
              onPress={retry}
              style={s.retry}
            >
              <Text style={s.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        hardwareAccelerated={Platform.OS === 'android'}
        visible={pickerOpen}
        transparent
        animationType={reduced ? 'none' : 'fade'}
        statusBarTranslucent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Fechar seletor de período"
            onPress={() => setPickerOpen(false)}
          />
          <View style={s.picker} accessibilityViewIsModal>
            <View style={s.pickerHeader}>
              <Text accessibilityRole="header" style={s.pickerTitle}>
                Escolha o período
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar período"
                onPress={() => setPickerOpen(false)}
                style={s.iconButton}
              >
                <Icon name="close" size={20} />
              </Pressable>
            </View>
            <View style={s.yearSelector}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ano anterior"
                disabled={pickerYear <= 1900}
                onPress={() => setPickerYear(value => value - 1)}
                style={s.iconButton}
              >
                <Icon name="back" size={20} />
              </Pressable>
              <Text style={s.pickerYear}>{pickerYear}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo ano"
                disabled={pickerYear >= 9999}
                onPress={() => setPickerYear(value => value + 1)}
                style={s.iconButton}
              >
                <Icon name="chevron" size={20} />
              </Pressable>
            </View>
            <View style={s.months}>
              {months.map((month, index) => {
                const selected =
                  period.year === pickerYear && period.month === index + 1;
                return (
                  <Pressable
                    key={month}
                    accessibilityRole="button"
                    accessibilityLabel={`${month} de ${pickerYear}`}
                    accessibilityState={{ selected }}
                    onPress={() => chooseMonth(index + 1)}
                    style={({ pressed }) => [
                      s.monthOption,
                      selected && s.selectedMonth,
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={[s.optionText, selected && s.selectedText]}>
                      {month.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.pickerNote}>
              Entradas, saídas, categorias e compras no crédito do mês
              selecionado.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    content: { paddingHorizontal: 18, paddingBottom: 34 },
    eyebrow: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.2,
      color: colors.primary,
      marginBottom: 2,
    },
    greeting: {
      fontFamily,
      fontSize: 19,
      lineHeight: 26,
      color: colors.text,
    },
    name: { fontFamily: fontFamilyBold, fontWeight: '700' },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
    },
    monthlyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
    },
    monthNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryCard: { gap: 14, marginTop: 14 },
    monthlySummary: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 14,
    },
    sectionTitle: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    balanceCopy: { flex: 1 },
    label: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
    },
    caption: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
      color: colors.secondary,
    },
    visibility: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
    },
    remaining: {
      gap: 10,
      backgroundColor: colors.primarySoft,
      padding: 15,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    remainingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    remainingValue: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    period: {
      minWidth: 0,
      minHeight: 38,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 999,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
    },
    month: {
      flexShrink: 1,
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      color: colors.text,
    },
    errorBox: {
      marginTop: 16,
      backgroundColor: colors.errorSoft,
      borderRadius: 16,
      padding: 14,
    },
    error: { fontFamily, color: colors.error, fontSize: 13, lineHeight: 20 },
    retry: { paddingVertical: 12 },
    link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 13 },
    pressed: { opacity: 0.7 },
    overlay: {
      flex: 1,
      backgroundColor: colors.dialogBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    picker: {
      width: '100%',
      maxWidth: 360,
      padding: 22,
      borderRadius: 28,
      backgroundColor: colors.dialogSurface || colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerTitle: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 20,
      color: colors.text,
    },
    iconButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    pickerYear: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 24,
      color: colors.text,
    },
    months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    monthOption: {
      width: '30%',
      flexGrow: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedMonth: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionText: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      color: colors.text,
    },
    selectedText: { color: colors.onPrimary, fontFamily: fontFamilyBold },
    pickerNote: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
      textAlign: 'center',
      marginTop: 20,
    },
  });

export default memo(HomeScreen);
