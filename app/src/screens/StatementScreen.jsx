import {
  useInputTheme,
  useTheme,
  useThemeStyles,
} from '../contexts/ThemeContext';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import StatementList from '../components/statement/StatementList';
import StatementDay from '../components/statement/StatementDay';
import createStyles from '../components/statement/statementStyles';
import {
  indexStatementRows,
  filterStatementRows,
  summarizeStatementRows,
} from '../utils/statement';
import { ListSkeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import SegmentedControl from '../components/SegmentedControl';
import StatementFilters, {
  countFilters,
  emptyFilters,
} from '../components/StatementFilters';
import { normalizeCategoryName } from '../data/categories';
import useTransactions from '../hooks/useTransactions';
import useTransactionDeletion from '../hooks/useTransactionDeletion';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { formatCurrency } from '../utils/money';
import GlassPanel from '../components/silver/GlassPanel';

const payments = [
  'Pix',
  'Débito',
  'Boleto',
  'Dinheiro',
  'Transferência',
  'Outro',
];
const dayKey = group => group.date;
const typeOptions = ['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map(
  (value, index) => ({
    value,
    label: ['Todos', 'Entradas', 'Saídas', 'Transf.'][index],
    accessibilityLabel:
      'Mostrar ' + ['Todos', 'Entradas', 'Saídas', 'Transf.'][index],
  }),
);
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
  const fillViewport = useCallback(() => {
    if (
      viewport.current > 0 &&
      contentHeight.current <= viewport.current + 180
    ) {
      loadMore();
    }
  }, [loadMore]);
  const measureViewport = useCallback(
    event => {
      viewport.current = event.nativeEvent.layout.height;
      fillViewport();
    },
    [fillViewport],
  );
  const measureContent = useCallback(
    (_, height) => {
      contentHeight.current = height;
      fillViewport();
    },
    [fillViewport],
  );
  const index = useMemo(() => indexStatementRows(rows), [rows]);
  const monthKey = `${month.getFullYear()}-${String(
    month.getMonth() + 1,
  ).padStart(2, '0')}`;
  const filtered = useMemo(
    () =>
      filterStatementRows(
        rows,
        index.searchText,
        monthKey,
        normalizeCategoryName(search),
        type,
        filters,
      ),
    [rows, index, monthKey, search, type, filters],
  );
  const { groups, totals, dayById } = useMemo(
    () => summarizeStatementRows(filtered, today),
    [filtered, today],
  );
  const { accounts, categories } = index;
  const filterCount = countFilters(filters);
  const move = useCallback(
    offset =>
      setMonth(
        previous =>
          new Date(previous.getFullYear(), previous.getMonth() + offset, 1),
      ),
    [],
  );
  const closeRow = useCallback(() => setOpenRow(null), []);
  const changeOpenRow = useCallback(
    (id, value) => setOpenRow(value ? id : null),
    [],
  );
  const { requestDelete } = deletion;
  const deleteRow = useCallback(
    row => {
      setOpenRow(null);
      requestDelete(row);
    },
    [requestDelete],
  );
  const openFilters = useCallback(() => setOpen(true), []);
  const closeFilters = useCallback(() => setOpen(false), []);
  const applyFilters = useCallback(value => {
    setFilters(value);
    setOpen(false);
  }, []);
  const clearFilters = useCallback(() => {
    setFilters(emptyFilters());
    setSearch('');
    setType('ALL');
  }, []);
  const openDay = dayById.get(openRow);
  const renderDay = useCallback(
    ({ item }) => (
      <StatementDay
        group={item}
        openRow={item.date === openDay ? openRow : null}
        onOpenChange={changeOpenRow}
        onDelete={deleteRow}
        onOpenTransaction={onOpenTransaction}
      />
    ),
    [openDay, openRow, changeOpenRow, deleteRow, onOpenTransaction],
  );
  const header = useMemo(
    () => (
      <>
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
                  totals.INCOME - totals.EXPENSE >= 0 ? '+ ' : '− '
                }${formatCurrency(Math.abs(totals.INCOME - totals.EXPENSE))}`}
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
                  {loading && !rows.length
                    ? '—'
                    : formatCurrency(totals[value])}
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
            onPress={openFilters}
            style={[s.filter, filterCount > 0 && s.filterActive]}
          >
            <Icon
              name="filters"
              size={23}
              color={filterCount ? colors.primary : colors.text}
            />
            {!!filterCount && <Text style={s.badge}>{filterCount}</Text>}
          </Pressable>
        </View>
        <SegmentedControl
          style={s.tabs}
          value={type}
          onChange={setType}
          options={typeOptions}
        />
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Movimentações
        </Text>
      </>
    ),
    [
      s,
      inputTheme,
      colors,
      month,
      loading,
      rows.length,
      totals,
      hasNext,
      search,
      filterCount,
      type,
      move,
      openFilters,
    ],
  );
  const footer = useMemo(
    () => (
      <>
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
              onPress={clearFilters}
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
      </>
    ),
    [
      loading,
      rows.length,
      error,
      filtered.length,
      hasNext,
      s,
      colors.secondary,
      retry,
      loadMore,
      clearFilters,
    ],
  );
  return (
    <View style={s.root}>
      <StatementList
        accessibilityLabel="Lista de transações"
        data={groups}
        keyExtractor={dayKey}
        renderItem={renderDay}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={closeRow}
        onLayout={measureViewport}
        onContentSizeChange={measureContent}
        onReachEnd={loadMore}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={false}
      />
      <ConfirmationDialog {...deletion.dialogProps} />
      <StatementFilters
        visible={open}
        initial={filters}
        accounts={accounts}
        categories={categories}
        payments={payments}
        onClose={closeFilters}
        onApply={applyFilters}
      />
    </View>
  );
}
export default memo(StatementScreen);
