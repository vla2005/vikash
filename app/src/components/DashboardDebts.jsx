import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassPanel from './silver/GlassPanel';
import DebtMonthlyChart from './DebtMonthlyChart';
import Icon from './Icon';
import Skeleton, { SkeletonGroup } from './Skeleton';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { hiddenAmount } from '../utils/dashboard';
import { debtToday, formatDebtCents, summarizeDebts } from '../utils/debts';
import { invoiceMonthLabel } from '../utils/initialInvoices';
import { fontFamily, fontFamilyBold } from '../theme';

const monthsPerPage = 7;

export default memo(function DashboardDebts({ list, hidden, onOpenDebts }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const { debts, loading, error, retry } = list;
  const [page, setPage] = useState(0);
  const today = debtToday();
  const { openTotal, overdueTotal, dueByMonthEnd, months, monthKeys } = useMemo(
    () => summarizeDebts(debts, today), [debts, today],
  );
  const lastPage = Math.max(0, Math.ceil(monthKeys.length / monthsPerPage) - 1);
  const visiblePage = Math.min(page, lastPage);
  const chartMonths = useMemo(() => monthKeys.slice(visiblePage * monthsPerPage, (visiblePage + 1) * monthsPerPage),
    [monthKeys, visiblePage]);
  const chartMax = lastPage > 0 ? monthKeys.reduce((max, month) => Math.max(max, months[month]), 0) / 100 : undefined;

  return (
    <GlassPanel testID="dashboard-debts" style={s.panel}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>Dívidas</Text>
        {onOpenDebts && (
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir dívidas em Contas" onPress={onOpenDebts}
            style={({ pressed }) => [s.iconButton, s.shortcut, pressed && s.pressed]}>
            <Icon name="chevron" size={18} color={colors.warning} />
          </Pressable>
        )}
      </View>
      {loading && !debts.length ? (
        <SkeletonGroup label="Carregando dívidas" style={s.summary}>
          <Skeleton width="55%" height={28} />
          <Skeleton width="100%" height={100} />
        </SkeletonGroup>
      ) : error ? (
        <>
          <Text accessibilityRole="alert" style={s.caption}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={s.retry}>
            <Text style={s.link}>Tentar carregar dívidas novamente</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={s.summary}>
            <Text style={s.caption}>Total em aberto</Text>
            <Text style={s.total}>{hidden ? hiddenAmount : formatDebtCents(openTotal)}</Text>
          </View>
          {hidden ? (
            <Text style={s.caption}>Mostre os valores para ver os vencimentos.</Text>
          ) : openTotal === 0 ? (
            <Text style={s.caption}>Nenhuma parcela em aberto.</Text>
          ) : (
            <>
              <View style={s.metrics}>
                <View style={s.metric}>
                  <Text style={s.caption}>A pagar até o fim do mês</Text>
                  <Text style={s.amount}>{formatDebtCents(dueByMonthEnd)}</Text>
                </View>
                {overdueTotal > 0 && (
                  <View style={s.metric}>
                    <Text style={s.caption}>Em atraso</Text>
                    <Text style={[s.amount, s.overdue]}>{formatDebtCents(overdueTotal)}</Text>
                  </View>
                )}
              </View>
              <View style={s.projection}>
                <View style={s.header}>
                  <Text accessibilityRole="header" style={s.subtitle}>A pagar por mês</Text>
                  {lastPage > 0 && (
                    <View style={s.pager}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Meses anteriores de dívidas"
                        disabled={visiblePage === 0} onPress={() => setPage(visiblePage - 1)}
                        style={({ pressed }) => [s.iconButton, (pressed || visiblePage === 0) && s.pressed]}>
                        <View style={s.reverse}><Icon name="chevron" size={19} color={colors.secondary} /></View>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel="Próximos meses de dívidas"
                        disabled={visiblePage === lastPage} onPress={() => setPage(visiblePage + 1)}
                        style={({ pressed }) => [s.iconButton, (pressed || visiblePage === lastPage) && s.pressed]}>
                        <Icon name="chevron" size={19} color={colors.secondary} />
                      </Pressable>
                    </View>
                  )}
                </View>
                <DebtMonthlyChart months={months} monthKeys={chartMonths} maxY={chartMax} />
                {chartMonths.map(month => (
                  <View key={month} style={s.line}>
                    <Text style={s.caption}>{invoiceMonthLabel(month)}</Text>
                    <Text style={s.amount}>{formatDebtCents(months[month])}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </GlassPanel>
  );
});

const createStyles = colors => StyleSheet.create({
  panel: { marginTop: 18, padding: 18, borderRadius: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  shortcut: { marginLeft: 'auto', alignItems: 'flex-end' },
  pressed: { opacity: 0.45 },
  pager: { flexDirection: 'row', marginLeft: 'auto' },
  reverse: { transform: [{ rotate: '180deg' }] },
  title: { flexShrink: 1, color: colors.text, fontFamily: fontFamilyBold, fontSize: 18, lineHeight: 24 },
  subtitle: { flexShrink: 1, color: colors.text, fontFamily: fontFamilyBold, fontSize: 14, lineHeight: 20 },
  summary: { gap: 5 },
  caption: { color: colors.secondary, fontFamily, fontSize: 13, lineHeight: 19 },
  total: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 28, lineHeight: 36, fontVariant: ['tabular-nums'] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { flexGrow: 1, flexBasis: 116, padding: 10, gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  amount: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  overdue: { color: colors.negative },
  projection: { gap: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12 },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.primary, fontFamily: fontFamilyBold, fontSize: 13 },
});
