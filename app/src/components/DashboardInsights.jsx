import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { creditCardLabel } from '../utils/creditCards';
import Icon from './Icon';
import IconTile from './IconTile';
import Skeleton from './Skeleton';
import { AnimatedPressable } from './motion/AnimatedPrimitives';
import useDashboard from '../hooks/useDashboard';
import { previousPeriod, spendingPace, hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function DashboardInsights({
  data,
  period,
  invoices = [],
  hidden,
  accessToken,
  revision,
  onOpenCard,
}) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const previous = previousPeriod(period);
  const hasPrevious = previous.year >= 1900;
  const comparison = useDashboard(
    previous.year,
    previous.month,
    hasPrevious ? accessToken : null,
    revision,
  );
  const pace = spendingPace(data.expenses, period);
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const dueInvoice = [...invoices].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )[0];
  const dueInDays = dueInvoice
    ? Math.round(
        (Date.parse(dueInvoice.dueDate + 'T00:00:00Z') -
          Date.parse(todayKey + 'T00:00:00Z')) /
          86400000,
      )
    : null;
  const highLimit = (data.creditCards ?? [])
    .filter(card => card.creditLimit > 0)
    .map(card => ({
      ...card,
      used:
        (Math.max(0, card.creditLimit - card.availableLimit) /
          card.creditLimit) *
        100,
    }))
    .sort((a, b) => b.used - a.used)[0];
  const money = value => (hidden ? hiddenAmount : formatCurrency(value));
  const delta = comparison.data
    ? data.expenses - comparison.data.expenses
    : null;

  return (
    <View style={s.section}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.eyebrow}>RADAR INTELIGENTE</Text>
          <Text accessibilityRole="header" style={s.title}>
            De olho no mês
          </Text>
        </View>
        <View style={s.sparkleBadge}>
          <Icon name="sparkle" size={16} color={colors.primary} />
        </View>
      </View>

      <GlassPanel style={s.panel}>
        {dueInvoice && dueInDays <= 7 && (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Abrir próxima fatura"
            scaleActive={0.98}
            onPress={() =>
              onOpenCard?.(dueInvoice.creditCard.uuid, dueInvoice.uuid)
            }
            style={s.notice}
          >
            <IconTile tone={dueInDays < 0 ? 'negative' : 'warning'}>
              <Icon
                name="warning"
                size={21}
                color={dueInDays < 0 ? colors.negative : colors.warning}
              />
            </IconTile>
            <View style={s.copy}>
              <Text style={s.noticeTitle}>
                {dueInDays < 0
                  ? 'Fatura atrasada'
                  : dueInDays === 0
                  ? 'Fatura vence hoje'
                  : 'Fatura vence em breve'}
              </Text>
              <Text style={s.caption}>
                {creditCardLabel(dueInvoice.creditCard)} ·{' '}
                {money(dueInvoice.total)}
              </Text>
            </View>
            <Icon name="chevron" size={16} color={colors.secondary} />
          </AnimatedPressable>
        )}

        {highLimit?.used >= 80 && (
          <View style={s.notice}>
            <IconTile tone="warning">
              <Icon name="creditCard" size={21} color={colors.warning} />
            </IconTile>
            <View style={s.copy}>
              <Text style={s.noticeTitle}>Limite próximo do máximo</Text>
              <Text style={s.caption}>
                {creditCardLabel(highLimit)} ·{' '}
                {hidden ? hiddenAmount : `${Math.round(highLimit.used)}% utilizado`}
              </Text>
            </View>
          </View>
        )}

        <View style={s.comparison}>
          <Text style={s.label}>Saídas das contas · mês anterior completo</Text>
          {!hasPrevious ? (
            <Text style={s.caption}>Sem período anterior disponível.</Text>
          ) : comparison.loading ? (
            <Skeleton width="75%" height={22} />
          ) : comparison.error ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar comparação novamente"
              onPress={comparison.retry}
              style={s.retry}
            >
              <Text style={s.caption}>
                Comparação indisponível. Tentar novamente
              </Text>
            </Pressable>
          ) : (
            delta != null && (
              <Text
                style={[
                  s.comparisonValue,
                  !hidden && {
                    color:
                      delta > 0
                        ? colors.negative
                        : delta < 0
                        ? colors.positive
                        : colors.text,
                  },
                ]}
              >
                {hidden
                  ? hiddenAmount
                  : delta === 0
                  ? 'Mesmo valor do mês anterior'
                  : `${formatCurrency(Math.abs(delta))} a ${
                      delta > 0 ? 'mais' : 'menos'
                    }`}
              </Text>
            )
          )}
        </View>

        {pace && (
          <View style={s.metrics}>
            <View style={s.metricPod}>
              <Text style={s.label}>Média diária</Text>
              <Text style={s.value}>{money(pace.daily)}</Text>
            </View>
            {pace.projection != null && (
              <View style={s.metricPod}>
                <Text style={s.label}>Projeção de saídas</Text>
                <Text style={s.value}>{money(pace.projection)}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={s.caption}>
          {pace?.projection != null
            ? 'Saídas das contas. Estimativa pelo ritmo do mês, sem prever novas compras.'
            : 'Saídas das contas, incluindo pagamentos de faturas.'}
        </Text>
      </GlassPanel>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    section: { marginTop: 22 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    eyebrow: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.1,
      color: colors.primary,
      marginBottom: 2,
    },
    title: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    sparkleBadge: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.28)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    panel: {
      borderRadius: 24,
      backgroundColor: colors.surface,
      padding: 20,
      gap: 16,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 13,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    noticeTitle: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    caption: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
      color: colors.secondary,
    },
    label: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
    },
    comparison: {
      gap: 5,
      padding: 14,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    comparisonValue: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 25,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    metrics: { flexDirection: 'row', gap: 10 },
    metricPod: {
      flex: 1,
      gap: 4,
      padding: 13,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    value: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 17,
      lineHeight: 24,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    retry: { paddingVertical: 8 },
    pressed: { opacity: 0.7 },
  });
