import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pointerEventsStyles } from '../theme/interaction';
import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import SegmentedControl from './SegmentedControl';
import { ListSkeleton } from './Skeleton';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import Donut from './CategoryDonut';
import CategoryExpensesLegend from './CategoryExpensesLegend';

const keyFor = category =>
  category.customCategoryUuid
    ? `custom:${category.customCategoryUuid}`
    : category.defaultCategoryId != null
    ? `default:${category.defaultCategoryId}`
    : 'uncategorized';

const percentage = fraction =>
  `${(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function CategoryExpensesChart({
  categories = [],
  creditCategories = [],
  periodLabel,
  hidden = false,
  scope = 'accounts',
  onChangeScope,
  creditLoading = false,
  creditError = '',
  onRetryCredit,
}) {
  const { categoryColors, colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [selection, setSelection] = useState(null);
  const source = scope === 'credit' ? creditCategories : categories;
  const expenses = useMemo(
    () =>
      source
        .filter(
          category => Number.isFinite(category.total) && category.total > 0,
        )
        .sort((a, b) => b.total - a.total),
    [source],
  );
  const total = useMemo(
    () => expenses.reduce((sum, category) => sum + category.total, 0),
    [expenses],
  );
  const slices = useMemo(
    () =>
      expenses.map(category => ({
        ...category,
        key: keyFor(category),
        color:
          categoryColors.find(color => color.key === category.color)
            ?.foreground || colors.secondary,
        fraction: category.total / total,
      })),
    [expenses, total, categoryColors, colors.secondary],
  );
  const loading = scope === 'credit' && creditLoading;
  const error = scope === 'credit' && creditError;
  const selectedIndex =
    !hidden &&
    !loading &&
    !error &&
    selection?.scope === scope &&
    selection?.periodLabel === periodLabel
      ? slices.findIndex(slice => slice.key === selection.key)
      : -1;
  const selected = slices[selectedIndex];

  useEffect(() => {
    setSelection(null);
  }, [scope, periodLabel, hidden]);

  useEffect(() => {
    setSelection(previous =>
      previous &&
      (loading || error || !slices.some(slice => slice.key === previous.key))
        ? null
        : previous,
    );
  }, [slices, loading, error]);

  const select = useCallback(
    index => {
      if (hidden) {
        return;
      }
      const slice = slices[index];
      setSelection(previous =>
        slice &&
        !(
          previous?.key === slice.key &&
          previous.scope === scope &&
          previous.periodLabel === periodLabel
        )
          ? { key: slice.key, scope, periodLabel }
          : null,
      );
    },
    [hidden, slices, scope, periodLabel],
  );

  const money = value => (hidden ? hiddenAmount : formatCurrency(value));

  return (
    <GlassPanel style={s.card}>
      <View style={s.heading}>
        <View style={s.titleGroup}>
          <Text style={s.eyebrow}>DISTRIBUIÇÃO • CATEGORIAS</Text>
          <Text accessibilityRole="header" style={s.title}>
            Gastos do mês
          </Text>
        </View>
        {!!onChangeScope && (
          <SegmentedControl
            style={s.tabs}
            value={scope}
            onChange={onChangeScope}
            options={[
              {
                value: 'accounts',
                label: 'Contas',
                accessibilityLabel: 'Mostrar gastos das contas',
              },
              {
                value: 'credit',
                label: 'Crédito',
                accessibilityLabel: 'Mostrar gastos no crédito',
              },
            ]}
          />
        )}
      </View>
      {loading ? (
        <ListSkeleton label="Carregando gastos no crédito" count={3} />
      ) : error ? (
        <View style={s.empty}>
          <Text accessibilityRole="alert" style={s.subtitle}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar gastos no crédito"
            onPress={onRetryCredit}
            style={s.linkButton}
          >
            <Text style={s.link}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : total > 0 ? (
        <>
          <View style={s.metric} accessibilityLiveRegion="polite">
            <Text
              testID="category-spending-value"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={s.total}
            >
              {money(selected?.total ?? total)}
            </Text>
            <Text testID="category-spending-name" style={s.subtitle}>
              {selected?.name || periodLabel || 'Total do mês'}
            </Text>
          </View>
          <View
            style={s.chart}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              hidden
                ? 'Gastos do mês. Valores ocultos.'
                : `Gastos do mês. Total: ${formatCurrency(total)}. ${slices
                    .map(
                      slice =>
                        `${slice.name}: ${percentage(
                          slice.fraction,
                        )}, ${formatCurrency(slice.total)}`,
                    )
                    .join('. ')}${
                    selected ? `. Selecionada: ${selected.name}.` : ''
                  }`
            }
          >
            <Donut
              slices={slices}
              hidden={hidden}
              periodLabel={periodLabel}
              selectedIndex={selectedIndex}
              onSelectionChange={select}
            />
            <View
              style={[s.center, pointerEventsStyles.none]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              aria-hidden
            >
              <Text numberOfLines={2} style={s.centerName}>
                {hidden ? 'Valores ocultos' : selected?.name || 'do mês'}
              </Text>
              <Text
                testID="category-spending-share"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={s.share}
              >
                {hidden
                  ? '•••'
                  : selected
                  ? percentage(selected.fraction)
                  : '100%'}
              </Text>
            </View>
          </View>
          <CategoryExpensesLegend
            key={`${scope}:${periodLabel}:${hidden}`}
            slices={slices}
            selectedIndex={selectedIndex}
            onSelect={select}
            hidden={hidden}
          />
        </>
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Nenhum gasto neste período</Text>
          <Text style={s.subtitle}>
            Os gastos aparecerão aqui quando houver movimentações.
          </Text>
        </View>
      )}
      <Text style={s.note}>
        {scope === 'credit'
          ? 'Valor integral das compras no crédito feitas no mês.'
          : 'Gastos registrados nas contas neste mês.'}
      </Text>
    </GlassPanel>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    card: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
    },
    titleGroup: {
      flexGrow: 1,
      gap: 2,
    },
    eyebrow: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.1,
      color: colors.primary,
    },
    title: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    tabs: { width: 162 },
    subtitle: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
      marginTop: 3,
    },
    metric: {
      marginTop: 14,
      minHeight: 68,
      padding: 14,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    total: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.8,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    chart: {
      width: '100%',
      maxWidth: 280,
      aspectRatio: 1,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 18,
    },
    center: {
      position: 'absolute',
      left: '24%',
      right: '24%',
      top: '25%',
      bottom: '25%',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 3,
    },
    centerName: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      color: colors.secondary,
    },
    share: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 28,
      lineHeight: 38,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    note: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 12,
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
    },
    empty: { paddingVertical: 24, gap: 6 },
    emptyTitle: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
    },
    linkButton: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
    link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
  });

export default React.memo(CategoryExpensesChart);
