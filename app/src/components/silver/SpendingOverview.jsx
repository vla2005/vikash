import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassPanel from './GlassPanel';
import CategoryBadge from '../CategoryBadge';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
import {
  AnimatedPressable,
  AnimatedProgressBar,
  StaggeredSection,
} from '../motion/AnimatedPrimitives';
import { useTheme } from '../../contexts/ThemeContext';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../../theme';
import { formatCurrency } from '../../utils/money';

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

export default function SpendingOverview({
  month,
  onMove,
  report,
  distribution,
}) {
  const { colors, categoryColors } = useTheme();
  const total = distribution.reduce((sum, item) => sum + item.total, 0);
  const change = report.data?.expensesPercentageChange;
  const periodKey = `${month.getFullYear()}-${month.getMonth()}`;

  return (
    <StaggeredSection index={0} triggerKey={periodKey}>
      <GlassPanel variant="hero" style={s.summary}>
        <View style={s.topRow}>
          <Text style={[s.eyebrow, { color: colors.primary }]}>
            PANORAMA MENSAL
          </Text>
          <View style={s.period}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior das categorias"
              scaleActive={0.88}
              onPress={() => onMove(-1)}
              style={s.arrow}
            >
              <View style={s.reverse}>
                <Icon name="chevron" size={15} color={colors.text} />
              </View>
            </AnimatedPressable>
            <Text style={[s.periodText, { color: colors.text }]}>
              {months[month.getMonth()]} de {month.getFullYear()}
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês das categorias"
              scaleActive={0.88}
              onPress={() => onMove(1)}
              style={s.arrow}
            >
              <Icon name="chevron" size={15} color={colors.text} />
            </AnimatedPressable>
          </View>
        </View>

        <Text style={[s.label, { color: colors.secondary }]}>
          Gastos por categoria
        </Text>

        {report.loading ? (
          <Skeleton width="70%" height={38} />
        ) : report.error ? (
          <>
            <Text
              accessibilityRole="alert"
              style={[s.caption, { color: colors.secondary }]}
            >
              {report.error}
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Recarregar gastos por categoria"
              scaleActive={0.95}
              onPress={report.retry}
              style={s.retryBtn}
            >
              <Text style={{ color: colors.primary, fontFamily: fontFamilyBold }}>
                Tentar novamente
              </Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[s.total, { color: colors.text }]}
            >
              {formatCurrency(total)}
            </Text>
            <Text style={[s.caption, { color: colors.secondary }]}>
              Gastos nas contas neste período
            </Text>
            {change != null && (
              <Text style={[s.change, { color: colors.secondary }]}>
                {change > 0 ? '+' : ''}
                {change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                nas saídas vs. mês anterior
              </Text>
            )}
            {total > 0 ? (
              <View
                accessibilityLabel="Distribuição dos gastos por categoria"
                style={s.bar}
              >
                {distribution
                  .filter(item => item.total > 0)
                  .map((item, index) => (
                    <View
                      key={index}
                      style={[
                        s.barPart,
                        {
                          flex: item.total / total,
                          backgroundColor: (
                            categoryColors.find(
                              color => color.key === item.color,
                            ) ||
                            categoryColors.find(color => color.key === 'gray')
                          ).accent,
                        },
                      ]}
                    />
                  ))}
              </View>
            ) : (
              <Text style={[s.caption, s.empty, { color: colors.secondary }]}>
                Nenhum gasto registrado neste mês.
              </Text>
            )}
          </>
        )}
      </GlassPanel>

      {!report.loading && !report.error && total > 0 && (
        <View style={s.highlights}>
          {distribution
            .filter(item => item.total > 0)
            .slice(0, 2)
            .map((item, index) => {
              const share = item.total / total;
              const accent = (
                categoryColors.find(color => color.key === item.color) ||
                categoryColors.find(color => color.key === 'gray')
              ).accent;
              return (
                <GlassPanel key={index} style={s.highlight}>
                  <CategoryBadge category={item} size={40} iconSize={22} vivid />
                  <Text
                    numberOfLines={2}
                    style={[s.highlightName, { color: colors.text }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    style={[s.highlightAmount, { color: colors.text }]}
                  >
                    {formatCurrency(item.total)}
                  </Text>
                  <Text style={[s.caption, { color: colors.secondary }]}>
                    {Math.round(share * 100)}% dos gastos
                  </Text>
                  <AnimatedProgressBar
                    progress={share}
                    color={accent}
                    height={4}
                    delay={100 + index * 60}
                  />
                </GlassPanel>
              );
            })}
        </View>
      )}
    </StaggeredSection>
  );
}

const s = StyleSheet.create({
  summary: { marginTop: 18, padding: 20, gap: 6 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: fontFamilyBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  label: { fontFamily: fontFamilyMedium, fontSize: 13 },
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  arrow: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    minHeight: 40,
    justifyContent: 'center',
  },
  reverse: { transform: [{ rotate: '180deg' }] },
  periodText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontFamilyBold,
    paddingHorizontal: 6,
  },
  total: {
    fontFamily: fontFamilyBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  caption: { fontFamily, fontSize: 12, lineHeight: 18 },
  change: { marginTop: 8, fontFamily, fontSize: 12, lineHeight: 18 },
  bar: { flexDirection: 'row', gap: 4, height: 10, marginTop: 14 },
  barPart: { borderRadius: 5 },
  empty: { marginTop: 10 },
  highlights: { flexDirection: 'row', gap: 12, marginTop: 12 },
  highlight: { flex: 1, padding: 16, gap: 8 },
  highlightName: { fontFamily: fontFamilyBold, fontSize: 14, lineHeight: 19 },
  highlightAmount: {
    fontFamily: fontFamilyBold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
});
