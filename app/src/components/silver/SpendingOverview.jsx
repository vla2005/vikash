import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassPanel from './GlassPanel';
import CategoryBadge from '../CategoryBadge';
import Icon from '../Icon';
import Skeleton from '../Skeleton';
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
  return (
    <>
      <GlassPanel style={s.summary}>
        <Text style={[s.label, { color: colors.secondary }]}>
          Gastos por categoria
        </Text>
        <View style={s.period}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior das categorias"
            onPress={() => onMove(-1)}
            style={s.arrow}
          >
            <View style={s.reverse}>
              <Icon name="chevron" size={16} color={colors.text} />
            </View>
          </Pressable>
          <Text style={[s.periodText, { color: colors.text }]}>
            {months[month.getMonth()]} de {month.getFullYear()}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês das categorias"
            onPress={() => onMove(1)}
            style={s.arrow}
          >
            <Icon name="chevron" size={16} color={colors.text} />
          </Pressable>
        </View>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recarregar gastos por categoria"
              onPress={report.retry}
              style={s.arrow}
            >
              <Text style={{ color: colors.primary, fontFamily }}>
                Tentar novamente
              </Text>
            </Pressable>
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
            .map((item, index) => (
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
                  {Math.round((item.total / total) * 100)}% dos gastos
                </Text>
              </GlassPanel>
            ))}
        </View>
      )}
    </>
  );
}
const s = StyleSheet.create({
  summary: { marginTop: 22, padding: 20 },
  label: { fontFamily: fontFamilyMedium, fontSize: 14 },
  period: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  arrow: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reverse: { transform: [{ rotate: '180deg' }] },
  periodText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  total: {
    fontFamily: fontFamilyBold,
    fontSize: 34,
    lineHeight: 44,
    letterSpacing: -1,
  },
  caption: { fontFamily, fontSize: 12, lineHeight: 19 },
  change: { marginTop: 15, fontFamily, fontSize: 12, lineHeight: 19 },
  bar: { flexDirection: 'row', gap: 3, height: 10, marginTop: 17 },
  barPart: { borderRadius: 5 },
  empty: { marginTop: 12 },
  highlights: { flexDirection: 'row', gap: 12, marginTop: 12 },
  highlight: { flex: 1, padding: 16, gap: 7 },
  highlightName: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 19 },
  highlightAmount: { fontFamily: fontFamilyBold, fontSize: 17, lineHeight: 24 },
});
