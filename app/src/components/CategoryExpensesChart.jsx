import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { categoryColors } from '../data/categories';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import useReducedMotion from '../hooks/useReducedMotion';

const center = 120;
const radius = 105;

function pieSlice(startAngle, endAngle) {
  const point = angle => ({ x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) });
  const start = point(startAngle);
  const end = point(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function CategoryExpensesChart({ categories = [], periodLabel }) {
  const animation = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const reducedMotion = useReducedMotion();
  const expenses = categories.filter(category => category.total > 0);
  const total = expenses.reduce((sum, category) => sum + category.total, 0);
  useEffect(() => {
    animation.setValue(0);
    setProgress(0);
    if (total <= 0) { return; }
    const listener = animation.addListener(({ value }) => setProgress(value));
    const drawing = Animated.timing(animation, {
      toValue: 1, duration: reducedMotion ? 2600 : 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: false,
    });
    drawing.start();
    return () => { animation.removeListener(listener); drawing.stop(); };
  }, [animation, categories, periodLabel, reducedMotion, total]);
  const revealedAngle = -Math.PI / 2 + Math.PI * 2 * progress;
  let angle = -Math.PI / 2;
  const slices = expenses.map(category => {
    const percentage = category.total / total * 100;
    const start = angle;
    angle += percentage / 100 * Math.PI * 2;
    const palette = categoryColors.find(color => color.key === category.color)
      ?? categoryColors.find(color => color.key === 'gray');
    return {
      ...category,
      key: category.customCategoryUuid ? `custom:${category.customCategoryUuid}`
        : category.defaultCategoryId != null ? `default:${category.defaultCategoryId}` : 'uncategorized',
      color: palette.foreground,
      percentage: `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
      startAngle: start,
      endAngle: angle,
    };
  });

  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.title}>Gastos por categoria</Text>
    <Text style={s.subtitle}>{periodLabel} · Contas e parcelas do crédito</Text>
    {total > 0 ? <>
      <View style={s.chart} accessible accessibilityRole="image"
        accessibilityLabel={`Gastos por categoria. Total: ${formatCurrency(total)}. ${slices.map(slice => `${slice.name}: ${slice.percentage}, ${formatCurrency(slice.total)}`).join('. ')}`}>
        <Svg width="100%" height={230} viewBox="0 0 240 240" accessible={false}>
          {slices.length === 1 && progress >= 1 ? <Circle cx={center} cy={center} r={radius} fill={slices[0].color} />
            : slices.map(slice => {
              const end = Math.min(slice.endAngle, revealedAngle);
              if (end <= slice.startAngle) { return null; }
              return <Path key={slice.key} d={pieSlice(slice.startAngle, end)} fill={slice.color}
                stroke={colors.surface} strokeWidth={2.5} strokeLinejoin="round" />;
            })}
        </Svg>
      </View>
      <View style={s.totalRow}><Text style={s.totalLabel}>Total no período</Text><Text style={s.total}>{formatCurrency(total)}</Text></View>
      <View style={s.legend}>
        {slices.map((slice, index) => <View key={slice.key} style={[s.legendRow, index > 0 && s.divider]}>
          <View style={[s.dot, { backgroundColor: slice.color }]} />
          <View style={s.category}><Text style={s.name}>{slice.name}</Text><Text style={s.percentage}>{`${slice.percentage} dos gastos`}</Text></View>
          <Text style={s.amount}>{formatCurrency(slice.total)}</Text>
        </View>)}
      </View>
    </> : <View style={s.empty}><Text style={s.emptyTitle}>Nenhum gasto neste período</Text><Text style={s.emptyText}>Os gastos por categoria aparecerão aqui quando houver movimentações.</Text></View>}
  </View>;
}

const s = StyleSheet.create({
  card: { marginTop: 18, backgroundColor: colors.surface, borderRadius: 22, padding: 16 },
  title: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 15, color: colors.text },
  subtitle: { fontFamily, fontSize: 11, lineHeight: 17, marginTop: 4, color: colors.secondary },
  chart: { alignItems: 'center', marginVertical: 8, width: '100%' },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingBottom: 16 },
  totalLabel: { fontFamily, fontSize: 12, color: colors.secondary },
  total: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 17, color: colors.text },
  legend: { borderTopWidth: 1, borderTopColor: colors.border },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  category: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 19, color: colors.text },
  percentage: { fontFamily, fontSize: 11, lineHeight: 17, marginTop: 2, color: colors.secondary },
  amount: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 13, color: colors.text, flexShrink: 1 },
  empty: { paddingVertical: 28 },
  emptyTitle: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.text, textAlign: 'center' },
  emptyText: { fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary, textAlign: 'center', marginTop: 8 },
});
