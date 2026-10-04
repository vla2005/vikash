import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import CategoryIcon from '../components/CategoryIcon';
import StatementFilters, { countFilters, emptyFilters } from '../components/StatementFilters';
import { categoryColors, normalizeCategoryName } from '../data/categories';
import useTransactions from '../hooks/useTransactions';
import { formatCurrency } from '../utils/money';
import { fontFamily } from '../theme';

const payments = ['Pix', 'Crédito', 'Débito', 'Boleto', 'Dinheiro', 'Transferência', 'Outro'];
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export default function StatementScreen({ profile, accessToken }) {
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [filters, setFilters] = useState(emptyFilters);
  const [open, setOpen] = useState(false);
  const { rows, loading, error, hasNext, loadMore, retry } = useTransactions(accessToken);
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  const fillViewport = () => { if (viewport.current > 0 && contentHeight.current <= viewport.current + 180) { loadMore(); } };
  const accounts = [...new Set(rows.map(row => row.account).filter(Boolean))];
  const categories = [...new Set(rows.map(row => row.category).filter(Boolean))];
  const monthly = rows.filter(row => row.date.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`));
  const filtered = monthly.filter(row => {
    const query = normalizeCategoryName(search);
    return (type === 'ALL' || row.type === type)
      && (!query || normalizeCategoryName([row.description, row.category, row.account, row.destinationAccount, row.payment].filter(Boolean).join(' ')).includes(query))
      && (!filters.accounts.length || filters.accounts.some(account => account === row.account || account === row.destinationAccount))
      && (!filters.categories.length || filters.categories.includes(row.category))
      && (!filters.payments.length || filters.payments.includes(row.payment))
      && (!filters.min || row.amount >= Number(filters.min.replace(',', '.')))
      && (!filters.max || row.amount <= Number(filters.max.replace(',', '.')))
      && (filters.transfers || row.type !== 'TRANSFER');
  });
  const groups = [...new Set(filtered.map(row => row.date))].sort().reverse();
  const total = value => filtered.filter(row => row.type === value).reduce((sum, row) => sum + row.amount, 0);
  const initials = (profile?.name || 'Você').trim().split(/\s+/).filter(Boolean).filter((_, index, parts) => index === 0 || index === parts.length - 1).map(part => part[0]).join('').toUpperCase();
  function dayLabel(date) {
    const value = new Date(`${date}T12:00:00`);
    const day = `${value.getDate()} de ${months[value.getMonth()].toLowerCase()}`;
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return `${value.toDateString() === today.toDateString() ? 'Hoje, ' : value.toDateString() === yesterday.toDateString() ? 'Ontem, ' : ''}${day}`;
  }
  const move = offset => setMonth(previous => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  return <View style={s.root}>
    <ScrollView accessibilityLabel="Lista de transações" contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" scrollEventThrottle={100}
      onLayout={event => { viewport.current = event.nativeEvent.layout.height; fillViewport(); }}
      onContentSizeChange={(_, height) => { contentHeight.current = height; fillViewport(); }}
      onScroll={({ nativeEvent }) => { if (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 240) { loadMore(); } }}>
      <View style={s.header}><BrandLogo width={116} /><View style={s.avatar}><Text style={s.initials}>{initials}</Text></View></View>
      <Text accessibilityRole="header" style={s.title}>Extrato</Text>
      <View style={s.month}><Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => move(-1)} style={s.arrow}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" size={18} /></View></Pressable><Text style={s.monthText}>{months[month.getMonth()]} {month.getFullYear()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => move(1)} style={s.arrow}><Icon name="chevron" size={18} /></Pressable></View>
      <View style={s.summary}>{[['INCOME', 'Entradas'], ['EXPENSE', 'Saídas']].map(([value, label], index) => <View key={value} style={[s.metric, index > 0 && s.divider]}><Text style={s.muted}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.total, { color: index ? '#98251E' : '#116B34' }]}>{formatCurrency(total(value))}</Text></View>)}</View>
      {hasNext && <Text style={s.preview}>Totais dos lançamentos carregados</Text>}
      <View style={s.searchRow}><View style={s.search}><Icon name="search" size={22} color="#707786" /><TextInput accessibilityLabel="Buscar lançamento" placeholder="Buscar lançamento" value={search} onChangeText={setSearch} placeholderTextColor="#858A99" style={s.input} /></View><Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros do extrato" onPress={() => setOpen(true)} style={[s.filter, countFilters(filters) > 0 && s.filterActive]}><Icon name="filters" size={23} color={countFilters(filters) ? '#0666FF' : '#303747'} />{!!countFilters(filters) && <Text style={s.badge}>{countFilters(filters)}</Text>}</Pressable></View>
      <View style={s.tabs}>{[['ALL', 'Todos'], ['INCOME', 'Entradas'], ['EXPENSE', 'Saídas'], ['TRANSFER', 'Transf.']].map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Mostrar ${label}`} accessibilityState={{ selected: type === key }} onPress={() => setType(key)} style={[s.tab, type === key && s.active]}><Text style={[s.tabText, type === key && s.white]}>{label}</Text></Pressable>)}</View>
      {groups.map(date => <View key={date}><Text style={s.day}>{dayLabel(date)}</Text><View style={s.list}>{filtered.filter(row => row.date === date).map((row, index) => {
        const palette = categoryColors.find(color => color.key === row.color) || categoryColors.find(color => color.key === 'gray');
        return <View key={row.id} style={[s.row, index > 0 && s.separator]}><View style={[s.tile, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} color={palette.foreground} size={23} /></View><View style={s.info}><Text numberOfLines={1} style={s.description}>{row.description}</Text><Text numberOfLines={2} style={s.detail}>{[row.category || 'Sem categoria', row.account].filter(Boolean).join(' · ')}</Text></View><View style={s.amountColumn}><Text style={[s.amount, row.type === 'INCOME' && s.green]}>{row.type === 'INCOME' ? '+ ' : row.type === 'EXPENSE' ? '− ' : ''}{formatCurrency(row.amount)}</Text><Text style={s.detail}>{row.payment}</Text></View></View>;
      })}</View></View>)}
      {loading && <View style={s.empty}><ActivityIndicator color="#0666FF" /><Text style={s.detail}>{rows.length ? 'Carregando mais lançamentos…' : 'Carregando extrato…'}</Text></View>}
      {!!error && <View style={s.empty}><Text accessibilityRole="alert" style={s.detail}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar extrato novamente" onPress={retry} style={s.arrow}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
      {!filtered.length && !loading && !error && <View style={s.empty}><Icon name="search" size={32} color="#858A99" /><Text style={s.emptyTitle}>Nenhum lançamento encontrado</Text><Text style={s.detail}>Tente outro período ou ajuste sua busca.</Text><Pressable accessibilityRole="button" onPress={() => { setFilters(emptyFilters()); setSearch(''); setType('ALL'); }} style={s.arrow}><Text style={s.link}>Limpar busca e filtros</Text></Pressable></View>}
      {hasNext && !loading && !error && <Pressable accessibilityRole="button" accessibilityLabel="Carregar mais transações" onPress={loadMore} style={s.arrow}><Text style={s.link}>Carregar mais</Text></Pressable>}
      <Text style={s.preview}>Busca e filtros aplicados aos lançamentos carregados.</Text>
    </ScrollView>
    {open && <StatementFilters visible initial={filters} accounts={accounts} categories={categories} payments={payments} onClose={() => setOpen(false)} onApply={value => { setFilters(value); setOpen(false); }} />}
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E3DF', alignItems: 'center', justifyContent: 'center' }, initials: { fontFamily, fontSize: 14, color: '#525867', fontWeight: '600' }, title: { fontFamily, fontSize: 36, lineHeight: 44, fontWeight: '700', letterSpacing: -1, color: '#111310' }, month: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginVertical: 12 }, arrow: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, monthText: { fontFamily, fontSize: 17, fontWeight: '600', color: '#111310' }, summary: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 16, flexDirection: 'row' }, metric: { flex: 1, paddingHorizontal: 15 }, divider: { borderLeftWidth: 1, borderLeftColor: '#E5E6EA' }, muted: { fontFamily, fontSize: 14, color: '#707786' }, total: { fontFamily, fontSize: 23, fontWeight: '700', marginTop: 4 }, searchRow: { flexDirection: 'row', gap: 10, marginTop: 18 }, search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DCDDE2', borderRadius: 12, backgroundColor: '#F0F0F1' }, input: { flex: 1, fontFamily, fontSize: 15, paddingVertical: 14, color: '#111827', minWidth: 0 }, filter: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCDDE2', borderRadius: 12, backgroundColor: '#FFF' }, filterActive: { borderColor: '#0666FF' }, badge: { position: 'absolute', right: -4, top: -5, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#0666FF', color: '#FFF', fontSize: 11 }, tabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#DCDDE2', borderRadius: 10, overflow: 'hidden', marginTop: 12, backgroundColor: '#FFF' }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center' }, active: { backgroundColor: '#0666FF' }, tabText: { fontFamily, fontSize: 13, color: '#707786' }, white: { color: '#FFF' }, day: { fontFamily, color: '#707786', fontWeight: '600', fontSize: 14, marginTop: 23, marginBottom: 10 }, list: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }, separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DFE1E6' }, tile: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, minWidth: 0 }, description: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 }, detail: { fontFamily, fontSize: 11, lineHeight: 16, color: '#707786' }, amountColumn: { alignItems: 'flex-end', gap: 3 }, amount: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111827', fontVariant: ['tabular-nums'] }, green: { color: '#116B34' }, empty: { paddingVertical: 40, alignItems: 'center', gap: 10 }, emptyTitle: { fontFamily, fontSize: 17, color: '#111827', fontWeight: '600', textAlign: 'center' }, link: { fontFamily, color: '#0666FF', fontSize: 14 }, preview: { fontFamily, fontSize: 11, color: '#8A8E98', textAlign: 'center', marginTop: 20 },
});
