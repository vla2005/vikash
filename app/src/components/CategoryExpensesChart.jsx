import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Mask } from 'react-native-svg';
import SegmentedControl from './SegmentedControl';
import { ListSkeleton } from './Skeleton';
import { categoryColors } from '../data/categories';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import useReducedMotion from '../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const radius = 76;
const circumference = 2 * Math.PI * radius;
const keyFor = category => category.customCategoryUuid ? `custom:${category.customCategoryUuid}`
  : category.defaultCategoryId != null ? `default:${category.defaultCategoryId}` : 'uncategorized';
const paletteFor = category => categoryColors.find(color => color.key === category.color)?.foreground || '#8995B0';

function Donut({ slices, hidden, periodLabel }) {
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const maskId = `expenses${useId().replace(/:/g, '')}`;
  useEffect(() => {
    if (hidden || reduced || !slices.length) { progress.setValue(1); return; }
    progress.setValue(0);
    // SVG properties update directly; no React state or whole-screen render on each frame.
    const drawing = Animated.timing(progress, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false, isInteraction: false });
    drawing.start();
    return () => drawing.stop();
  }, [progress, reduced, hidden, slices, periodLabel]);
  let offset = 0;
  return <Svg width="100%" height="100%" viewBox="0 0 200 200" accessible={false}>
    <Circle cx={100} cy={100} r={radius} fill="none" stroke={colors.border} strokeWidth={22} />
    {!hidden && <><Defs><Mask id={maskId} x="0" y="0" width="200" height="200" maskUnits="userSpaceOnUse">
      <AnimatedCircle cx={100} cy={100} r={radius} fill="none" stroke="white" strokeWidth={26}
        rotation={-90} origin="100, 100" strokeDasharray={[circumference, circumference]}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} />
    </Mask></Defs><G mask={`url(#${maskId})`}>
      {slices.map(slice => {
        const length = slice.fraction * circumference;
        const gap = slices.length === 1 ? 0 : Math.min(4, length * 0.15);
        const start = offset;
        offset += length;
        return <Circle key={slice.key} cx={100} cy={100} r={radius} fill="none" stroke={slice.color} strokeWidth={22}
          rotation={-90} origin="100, 100" strokeDasharray={[Math.max(0, length - gap), circumference]}
          strokeDashoffset={-start} strokeLinecap="butt" />;
      })}
    </G></>}
  </Svg>;
}

export default function CategoryExpensesChart({ categories = [], creditCategories = [], periodLabel, hidden = false,
  scope = 'accounts', onChangeScope, creditLoading = false, creditError = '', onRetryCredit }) {
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
    return shown.map(category => ({ ...category, key: keyFor(category), color: paletteFor(category), fraction: category.total / total }));
  }, [expenses, expanded, total]);
  const percentage = fraction => `${(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const money = value => hidden ? hiddenAmount : formatCurrency(value);
  const loading = scope === 'credit' && creditLoading;
  const error = scope === 'credit' && creditError;
  return <View style={s.card}>
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
          <View style={s.center} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
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
  </View>;
}
const s = StyleSheet.create({
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
