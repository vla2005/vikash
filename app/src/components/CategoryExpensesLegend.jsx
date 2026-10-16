import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AnimatedProgressBar } from './motion/AnimatedPrimitives';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';

const PAGE_SIZE = 5;
const percentage = fraction =>
  `${(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function CategoryExpensesLegend({ slices, selectedIndex, onSelect, hidden }) {
  const { scheme } = useTheme();
  const s = useThemeStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const scroller = useRef(null);
  const currentPage = useRef(0);
  const lastSelection = useRef(-1);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const pages = useMemo(() => {
    const result = [];
    for (let start = 0; start < slices.length; start += PAGE_SIZE) {
      result.push(slices.slice(start, start + PAGE_SIZE));
    }
    return result;
  }, [slices]);
  const paged = pages.length > 1;
  const rowHeight = Math.max(
    58,
    Math.ceil(44 * fontScale + 24 + StyleSheet.hairlineWidth),
  );
  const showPage = useCallback(
    (index, animated = true) => {
      const next = Math.max(0, Math.min(index, pages.length - 1));
      currentPage.current = next;
      setPage(next);
      if (width > 0) {
        scroller.current?.scrollTo({ x: next * width, y: 0, animated });
      }
    },
    [pages.length, width],
  );

  useLayoutEffect(() => {
    showPage(currentPage.current, false);
  }, [showPage]);

  useEffect(() => {
    if (lastSelection.current === selectedIndex) {
      return;
    }
    lastSelection.current = selectedIndex;
    if (selectedIndex >= 0) {
      showPage(Math.floor(selectedIndex / PAGE_SIZE));
    }
  }, [selectedIndex, showPage]);

  const onLayout = useCallback(event => {
    const next = event.nativeEvent.layout.width;
    if (Number.isFinite(next) && next > 0) {
      setWidth(previous => (previous === next ? previous : next));
    }
  }, []);

  const onPageSettled = useCallback(
    event => {
      if (width > 0) {
        const next = Math.round(event.nativeEvent.contentOffset.x / width);
        currentPage.current = Math.max(0, Math.min(next, pages.length - 1));
        setPage(currentPage.current);
      }
    },
    [width, pages.length],
  );

  const rows = (items, pageIndex) =>
    items.map((slice, index) => {
      const globalIndex = pageIndex * PAGE_SIZE + index;
      return (
        <LegendRow
          key={slice.key}
          slice={slice}
          index={globalIndex}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          hidden={hidden}
          activePage={!paged || page === pageIndex}
          rowHeight={paged ? rowHeight : undefined}
          styles={s}
        />
      );
    });

  return (
    <View testID="category-legend" onLayout={onLayout} style={s.legend}>
      {paged && width > 0 ? (
        <ScrollView
          ref={scroller}
          testID="category-legend-pager"
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onPageSettled}
          onScroll={Platform.OS === 'web' ? onPageSettled : undefined}
          scrollEventThrottle={Platform.OS === 'web' ? 100 : undefined}
          style={s.scroller}
        >
          {pages.map((items, pageIndex) => (
            <View
              key={pageIndex}
              testID={`category-legend-page-${pageIndex}`}
              style={{ width, minHeight: PAGE_SIZE * rowHeight }}
              accessibilityElementsHidden={page !== pageIndex}
              importantForAccessibility={
                page === pageIndex ? 'auto' : 'no-hide-descendants'
              }
              aria-hidden={page !== pageIndex}
            >
              {rows(items, pageIndex)}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={paged && { minHeight: PAGE_SIZE * rowHeight }}>
          {rows(pages[0] || [], 0)}
        </View>
      )}
      {paged && (
        <View
          style={s.pagination}
          accessibilityLabel={`Categorias, página ${page + 1} de ${
            pages.length
          }`}
        >
          {pages.map((_, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Página ${index + 1} de ${
                pages.length
              } das categorias`}
              accessibilityState={{ selected: page === index }}
              onPress={() => showPage(index)}
              style={({ pressed }) => [s.pageButton, pressed && s.pressed]}
            >
              <View
                testID={`category-legend-dot-${index}`}
                style={[
                  s.pageDot,
                  page === index &&
                    (scheme === 'light' ? s.activeLightDot : s.activeDarkDot),
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const LegendRow = memo(function LegendRow({
  slice,
  index,
  selectedIndex,
  onSelect,
  hidden,
  activePage,
  rowHeight,
  styles: s,
}) {
  const active = selectedIndex === index;
  const disabled = hidden || !activePage;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={
        hidden
          ? `${slice.name}. Valores ocultos.`
          : `${slice.name}: ${percentage(slice.fraction)}, ${formatCurrency(
              slice.total,
            )}`
      }
      accessibilityHint="Toque para destacar; toque novamente para ver o total do mês."
      onPress={() => onSelect(index)}
      style={({ pressed }) => [
        s.row,
        active && s.activeRow,
        rowHeight && { height: rowHeight },
        pressed && s.pressed,
      ]}
    >
      <View style={s.topLine}>
        <View
          style={[
            s.dot,
            { backgroundColor: slice.color },
            selectedIndex >= 0 && !active && s.dim,
          ]}
        />
        <Text numberOfLines={2} style={[s.name, active && s.selectedText]}>
          {slice.name}
        </Text>
        <Text style={[s.percentage, active && s.selectedText]}>
          {hidden ? '•••' : percentage(slice.fraction)}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          style={[s.amount, active && s.selectedText]}
        >
          {hidden ? hiddenAmount : formatCurrency(slice.total)}
        </Text>
      </View>
      <AnimatedProgressBar
        progress={hidden ? 0 : slice.fraction}
        color={slice.color}
        trackColor="rgba(255, 255, 255, 0.05)"
        height={3.5}
        delay={40 + (index % PAGE_SIZE) * 35}
      />
    </Pressable>
  );
});

const createStyles = colors =>
  StyleSheet.create({
    legend: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      marginBottom: 8,
    },
    scroller: { flexGrow: 0 },
    row: {
      justifyContent: 'center',
      gap: 6,
      minHeight: 58,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    activeRow: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    topLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    name: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilyMedium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.secondary,
    },
    percentage: {
      width: 44,
      textAlign: 'right',
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      fontVariant: ['tabular-nums'],
      color: colors.secondary,
    },
    amount: {
      width: 92,
      textAlign: 'right',
      fontFamily: fontFamilyMedium,
      fontSize: 13,
      lineHeight: 18,
      fontVariant: ['tabular-nums'],
      color: colors.secondary,
    },
    selectedText: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      color: colors.text,
    },
    dim: { opacity: 0.35 },
    pressed: { opacity: 0.72 },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 6,
    },
    pageButton: {
      width: 24,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeLightDot: { backgroundColor: '#000000' },
    activeDarkDot: { backgroundColor: '#FFFFFF' },
    pageDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.placeholder,
      opacity: 1,
    },
  });

export default memo(CategoryExpensesLegend);
