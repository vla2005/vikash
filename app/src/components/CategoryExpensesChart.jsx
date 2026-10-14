import { pointerEventsStyles } from '../theme/interaction';
import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import SegmentedControl from './SegmentedControl';
import { ListSkeleton } from './Skeleton';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

import Donut from './CategoryDonut';
const keyFor = category => category.customCategoryUuid ? `custom:${category.customCategoryUuid}`
  : category.defaultCategoryId != null ? `default:${category.defaultCategoryId}` : 'uncategorized';


function CategoryExpensesChart({ categories = [], creditCategories = [], periodLabel, hidden = false,
  scope = 'accounts', onChangeScope, creditLoading = false, creditError = '', onRetryCredit }) {
  const { categoryColors, colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale > 1.15;
  const source = scope === 'credit' ? creditCategories : categories;
  const expenses = useMemo(() => source.filter(category => category.total > 0).sort((a, b) => b.total - a.total), [source]);
  const total = expenses.reduce((sum, category) => sum + category.total, 0);
  const slices = useMemo(() => {
    const shown = expanded || expenses.length <= 4 ? expenses : [...expenses.slice(0, 3), {
      customCategoryUuid: 'dashboard-other', name: 'Outros', total: expenses.slice(3).reduce((sum, category) => sum + category.total, 0),
      color: 'purple',
    }];
    return shown.map(category => ({ ...category, key: keyFor(category), color: categoryColors.find(color => color.key === category.color)?.foreground || colors.secondary, fraction: category.total / total }));
  }, [expenses, expanded, total, categoryColors, colors]);
  const percentage = fraction => `${(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const money = value => hidden ? hiddenAmount : formatCurrency(value);
  const loading = scope === 'credit' && creditLoading;
  const error = scope === 'credit' && creditError;
  return <GlassPanel style={s.card}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Gastos do mês</Text>
      {!!onChangeScope && <SegmentedControl style={s.tabs} value={scope} onChange={onChangeScope}
        options={[{ value: 'accounts', label: 'Contas', accessibilityLabel: 'Mostrar gastos das contas' }, { value: 'credit', label: 'Crédito', accessibilityLabel: 'Mostrar gastos no crédito' }]} />}
    </View>
    <Text style={s.subtitle}>{periodLabel}</Text>
    {loading ? <ListSkeleton label="Carregando gastos no crédito" count={3} /> : error ? <View style={s.empty}>
      <Text accessibilityRole="alert" style={s.subtitle}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar gastos no crédito" onPress={onRetryCredit} style={s.linkButton}><Text style={s.link}>Tentar novamente</Text></Pressable>
    </View> : total > 0 ? <>
      <View style={[s.body, stacked && s.stacked]}>
        <View style={[s.chart, stacked && s.centerChart]} accessible accessibilityRole="image"
          accessibilityLabel={hidden ? 'Gastos do mês. Valores ocultos.' : `Gastos do mês. Total: ${formatCurrency(total)}. ${slices.map(slice => `${slice.name}: ${percentage(slice.fraction)}, ${formatCurrency(slice.total)}`).join('. ')}`}>
          <Donut slices={slices} hidden={hidden} periodLabel={periodLabel} />
          <View style={[s.center, pointerEventsStyles.none]} accessible={false} importantForAccessibility="no-hide-descendants">
            <Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, !stacked && width < 430 && s.smallTotal]}>{money(total)}</Text><Text style={s.subtitle}>total</Text>
          </View>
        </View>
        <View style={s.legend}>{slices.map(slice => <View key={slice.key} style={s.legendRow}>
          <View style={[s.dot, { backgroundColor: slice.color }]} /><View style={s.copy}>
            <View style={s.categoryLine}><Text style={s.name}>{slice.name}</Text><Text style={s.percentage}>{hidden ? '•••' : percentage(slice.fraction)}</Text></View>
            <Text style={s.amount}>{money(slice.total)}</Text>
          </View>
        </View>)}</View>
      </View>
      {expenses.length > 4 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? 'Mostrar menos categorias' : 'Ver todas as categorias'}
        onPress={() => setExpanded(value => !value)} style={s.linkButton}><Text style={s.link}>{expanded ? 'Ver menos' : 'Ver todas as categorias'}</Text></Pressable>}
    </> : <View style={s.empty}><Text style={s.emptyTitle}>Nenhum gasto neste período</Text><Text style={s.subtitle}>Os gastos aparecerão aqui quando houver movimentações.</Text></View>}
    <Text style={s.note}>{scope === 'credit' ? 'Valor integral das compras no crédito feitas no mês.' : 'Gastos registrados nas contas neste mês.'}</Text>
  </GlassPanel>;
}
const createStyles = (colors) => StyleSheet.create({
  card: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 24, padding: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { flexGrow: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  tabs: { width: 150 }, subtitle: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, marginTop: 3 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 16 }, stacked: { flexDirection: 'column', alignItems: 'stretch' },
  chart: { width: '45%', maxWidth: 210, aspectRatio: 1 }, centerChart: { width: 190, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  total: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, color: colors.text },
  smallTotal: { fontSize: 15 },
  legend: { flex: 1, gap: 13 }, legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 }, copy: { flex: 1, minWidth: 0, gap: 2 },
  categoryLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, name: { flex: 1, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  percentage: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 14, lineHeight: 21, color: colors.text },
  amount: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  note: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12, fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  empty: { paddingVertical: 24, gap: 6 }, emptyTitle: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  linkButton: { minHeight: 44, justifyContent: 'center', marginBottom: 8 }, link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
});

export default React.memo(CategoryExpensesChart);
