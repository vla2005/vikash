import {
  useInputTheme,
  useTheme,
  useThemeStyles,
} from '../contexts/ThemeContext';
import React, { memo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ScrollView from '../components/silver/DockScrollView';
import { ListSkeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import CategoryIcon from '../components/CategoryIcon';
import SegmentedControl from '../components/SegmentedControl';
import StatementFilters, {
  countFilters,
  emptyFilters,
} from '../components/StatementFilters';
import { normalizeCategoryName } from '../data/categories';
import useTransactions from '../hooks/useTransactions';
import useTransactionDeletion from '../hooks/useTransactionDeletion';
import SwipeableRow from '../components/SwipeableRow';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';
import GlassPanel from '../components/silver/GlassPanel';

const payments = [
  'Pix',
  'Débito',
  'Boleto',
  'Dinheiro',
  'Transferência',
  'Outro',
];
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
function StatementScreen({
  accessToken,
  onOpenTransaction,
  revision = 0,
  onDeleted,
}) {
  const inputTheme = useInputTheme();
  const { categoryColors } = useTheme();
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [filters, setFilters] = useState(emptyFilters);
  const [open, setOpen] = useState(false);
  const { rows, loading, error, hasNext, loadMore, retry, reload } =
    useTransactions(accessToken, '/api/transaction', revision);
  const [openRow, setOpenRow] = useState(null);
  const deletion = useTransactionDeletion(accessToken, () => {
    if (onDeleted) {
      onDeleted();
    } else {
      reload();
    }
  });
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  const fillViewport = () => {
    if (
      viewport.current > 0 &&
      contentHeight.current <= viewport.current + 180
    ) {
      loadMore();
    }
  };
  const accounts = [...new Set(rows.map(row => row.account).filter(Boolean))];
  const categories = [
    ...new Set(rows.map(row => row.category).filter(Boolean)),
  ];
  const monthly = rows.filter(row =>
    row.date.startsWith(
      `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
    ),
  );
  const filtered = monthly.filter(row => {
    const query = normalizeCategoryName(search);
    return (
      (type === 'ALL' ||
        row.type === type ||
        (type === 'EXPENSE' && row.type === 'INVOICE_PAYMENT')) &&
      (!query ||
        normalizeCategoryName(
          [
            row.description,
            row.category,
            row.account,
            row.destinationAccount,
            row.payment,
          ]
            .filter(Boolean)
            .join(' '),
        ).includes(query)) &&
      (!filters.accounts.length ||
        filters.accounts.some(
          account =>
            account === row.account || account === row.destinationAccount,
        )) &&
      (!filters.categories.length ||
        filters.categories.includes(row.category)) &&
      (!filters.payments.length || filters.payments.includes(row.payment)) &&
      (!filters.min || row.amount >= Number(filters.min.replace(',', '.'))) &&
      (!filters.max || row.amount <= Number(filters.max.replace(',', '.'))) &&
      (filters.transfers || row.type !== 'TRANSFER')
    );
  });
  const groups = [...new Set(filtered.map(row => row.date))].sort().reverse();
  const total = value =>
    filtered
      .filter(
        row =>
          row.type === value ||
          (value === 'EXPENSE' && row.type === 'INVOICE_PAYMENT'),
      )
      .reduce((sum, row) => sum + row.amount, 0);
  function dayLabel(date) {
    const value = new Date(`${date}T12:00:00`);
    const day = `${value.getDate()} de ${months[
      value.getMonth()
    ].toLowerCase()}`;
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
    );
    return `${
      value.toDateString() === today.toDateString()
        ? 'Hoje, '
        : value.toDateString() === yesterday.toDateString()
        ? 'Ontem, '
        : ''
    }${day}`;
  }
  const move = offset =>
    setMonth(
      previous =>
        new Date(previous.getFullYear(), previous.getMonth() + offset, 1),
    );
  return (
    <View style={s.root}>
      <ScrollView
        accessibilityLabel="Lista de transações"
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={100}
        onScrollBeginDrag={() => setOpenRow(null)}
        onLayout={event => {
          viewport.current = event.nativeEvent.layout.height;
          fillViewport();
        }}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
          fillViewport();
        }}
        onReachEnd={loadMore}
      >
        <Text accessibilityRole="header" style={s.title}>
          Extrato
        </Text>
        <GlassPanel style={s.summaryPanel}>
          <Text style={s.summaryHeading}>Resumo do período</Text>
          <View style={s.month}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              onPress={() => move(-1)}
              style={s.arrow}
            >
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <Icon name="chevron" size={18} />
              </View>
            </Pressable>
            <Text style={s.monthText}>
              {months[month.getMonth()]} {month.getFullYear()}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              onPress={() => move(1)}
              style={s.arrow}
            >
              <Icon name="chevron" size={18} />
            </Pressable>
          </View>
          <Text
            style={s.result}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {loading && !rows.length
              ? '—'
              : `${
                  total('INCOME') - total('EXPENSE') >= 0 ? '+ ' : '− '
                }${formatCurrency(
                  Math.abs(total('INCOME') - total('EXPENSE')),
                )}`}
          </Text>
          <Text style={s.summaryCaption}>
            Resultado dos lançamentos filtrados
          </Text>
          <View style={s.summary}>
            {[
              ['INCOME', 'Entradas'],
              ['EXPENSE', 'Saídas'],
            ].map(([value, label]) => (
              <View key={value} style={s.metric}>
                <View style={s.metricLabel}>
                  <Icon
                    name={value === 'INCOME' ? 'trendUp' : 'trendDown'}
                    size={17}
                    color={
                      value === 'INCOME' ? colors.positive : colors.negative
                    }
                  />
                  <Text style={s.detail}>{label}</Text>
                </View>
                <Text style={s.metricAmount}>
                  {loading && !rows.length ? '—' : formatCurrency(total(value))}
                </Text>
              </View>
            ))}
          </View>
          {hasNext && (
            <Text style={s.preview}>Totais dos lançamentos carregados</Text>
          )}
        </GlassPanel>
        <View style={s.searchRow}>
          <View style={s.search}>
            <Icon name="search" size={22} color={colors.secondary} />
            <TextInput
              {...inputTheme}
              accessibilityLabel="Buscar lançamento"
              placeholder="Buscar lançamento"
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.secondary}
              style={s.input}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros do extrato"
            onPress={() => setOpen(true)}
            style={[s.filter, countFilters(filters) > 0 && s.filterActive]}
          >
            <Icon
              name="filters"
              size={23}
              color={countFilters(filters) ? colors.primary : colors.text}
            />
            {!!countFilters(filters) && (
              <Text style={s.badge}>{countFilters(filters)}</Text>
            )}
          </Pressable>
        </View>
        <SegmentedControl
          style={s.tabs}
          value={type}
          onChange={setType}
          options={['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map(
            (value, index) => ({
              value,
              label: ['Todos', 'Entradas', 'Saídas', 'Transf.'][index],
              accessibilityLabel:
                'Mostrar ' + ['Todos', 'Entradas', 'Saídas', 'Transf.'][index],
            }),
          )}
        />
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Movimentações
        </Text>
        {groups.map(date => (
          <View key={date}>
            <Text style={s.day}>{dayLabel(date)}</Text>
            <GlassPanel style={s.list}>
              {filtered
                .filter(row => row.date === date)
                .map((row, index) => {
                  const palette =
                    categoryColors.find(color => color.key === row.color) ||
                    categoryColors.find(color => color.key === 'gray');
                  return (
                    <SwipeableRow
                      key={row.id}
                      label={`Abrir lançamento ${row.description}`}
                      actionLabel={`Excluir ${
                        row.purchaseUuid ? 'compra' : 'transação'
                      } ${row.description}`}
                      open={openRow === row.id}
                      onOpenChange={value => setOpenRow(value ? row.id : null)}
                      onAction={() => {
                        setOpenRow(null);
                        deletion.requestDelete(row);
                      }}
                      onPress={() => onOpenTransaction?.(row)}
                      style={[s.row, index > 0 && s.separator]}
                    >
                      <View
                        style={[s.tile, { backgroundColor: palette.accent }]}
                      >
                        <CategoryIcon
                          name={row.icon || 'wallet'}
                          color={palette.onAccent}
                          size={23}
                        />
                      </View>
                      <View style={s.info}>
                        <Text numberOfLines={2} style={s.description}>
                          {row.description}
                        </Text>
                        <Text numberOfLines={2} style={s.detail}>
                          {[
                            row.type === 'INVOICE_PAYMENT'
                              ? 'Pagamento de fatura'
                              : row.category || 'Sem categoria',
                            row.account,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      <View style={s.amountColumn}>
                        <Text
                          style={[s.amount, row.type === 'INCOME' && s.green]}
                        >
                          {row.type === 'INCOME'
                            ? '+ '
                            : ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type)
                            ? '− '
                            : ''}
                          {formatCurrency(row.amount)}
                        </Text>
                        <Text style={s.detail}>
                          {row.payment}
                          {row.installmentCount > 1
                            ? ' · ' +
                              row.installmentNumber +
                              '/' +
                              row.installmentCount
                            : ''}
                        </Text>
                      </View>
                    </SwipeableRow>
                  );
                })}
            </GlassPanel>
          </View>
        ))}
        {loading && (
          <ListSkeleton
            label={
              rows.length ? 'Carregando mais lançamentos' : 'Carregando extrato'
            }
            count={rows.length ? 2 : 5}
          />
        )}
        {!!error && (
          <View style={s.empty}>
            <Text accessibilityRole="alert" style={s.detail}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar extrato novamente"
              onPress={retry}
              style={s.arrow}
            >
              <Text style={s.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}
        {!filtered.length && !loading && !error && (
          <View style={s.empty}>
            <Icon name="search" size={32} color={colors.secondary} />
            <Text style={s.emptyTitle}>Nenhum lançamento encontrado</Text>
            <Text style={s.detail}>
              Tente outro período ou ajuste sua busca.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFilters(emptyFilters());
                setSearch('');
                setType('ALL');
              }}
              style={s.arrow}
            >
              <Text style={s.link}>Limpar busca e filtros</Text>
            </Pressable>
          </View>
        )}
        {hasNext && !loading && !error && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Carregar mais transações"
            onPress={loadMore}
            style={s.arrow}
          >
            <Text style={s.link}>Carregar mais</Text>
          </Pressable>
        )}
        <Text style={s.preview}>
          Busca e filtros aplicados aos lançamentos carregados.
        </Text>
      </ScrollView>
      <ConfirmationDialog {...deletion.dialogProps} />
      <StatementFilters
        visible={open}
        initial={filters}
        accounts={accounts}
        categories={categories}
        payments={payments}
        onClose={() => setOpen(false)}
        onApply={value => {
          setFilters(value);
          setOpen(false);
        }}
      />
    </View>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    summaryPanel: { padding: 20, marginTop: 22 },
    summaryHeading: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      color: colors.secondary,
    },
    result: {
      fontFamily: fontFamilyBold,
      fontSize: 33,
      lineHeight: 44,
      letterSpacing: -1,
      color: colors.text,
    },
    summaryCaption: {
      fontFamily,
      fontSize: 12,
      lineHeight: 19,
      color: colors.secondary,
      marginBottom: 18,
    },
    metric: { flex: 1, minWidth: 115, gap: 6, paddingVertical: 12 },
    metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    metricAmount: {
      fontFamily: fontFamilyBold,
      fontSize: 17,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    sectionTitle: {
      marginTop: 24,
      fontFamily: fontFamilyBold,
      fontSize: 20,
      color: colors.text,
    },
    root: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 30 },
    title: {
      fontFamily: fontFamilyBold,
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700',
      letterSpacing: -1,
      color: colors.text,
    },
    month: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 18,
      marginVertical: 12,
    },
    arrow: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthText: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    searchRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      fontFamily,
      fontSize: 15,
      paddingVertical: 14,
      color: colors.text,
      minWidth: 0,
    },
    filter: {
      width: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    filterActive: { borderColor: colors.primary },
    badge: {
      position: 'absolute',
      right: -4,
      top: -5,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: colors.primary,
      color: colors.onPrimary,
      fontSize: 11,
    },
    tabs: { marginTop: 12 },
    day: {
      fontFamily: fontFamilyMedium,
      color: colors.secondary,
      fontWeight: '600',
      fontSize: 14,
      marginTop: 23,
      marginBottom: 10,
    },
    list: { borderRadius: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 16,
      paddingHorizontal: 14,
      backgroundColor: 'transparent',
    },
    separator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    tile: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, minWidth: 0 },
    description: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 3,
    },
    detail: {
      fontFamily,
      fontSize: 11,
      lineHeight: 16,
      color: colors.secondary,
    },
    amountColumn: { alignItems: 'flex-end', gap: 3 },
    amount: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    green: { color: colors.positive },
    empty: { paddingVertical: 40, alignItems: 'center', gap: 10 },
    emptyTitle: {
      fontFamily: fontFamilyMedium,
      fontSize: 17,
      color: colors.text,
      fontWeight: '600',
      textAlign: 'center',
    },
    link: { fontFamily, color: colors.primary, fontSize: 14 },
    preview: {
      fontFamily,
      fontSize: 11,
      color: colors.secondary,
      textAlign: 'center',
      marginTop: 20,
    },
  });

export default memo(StatementScreen);
