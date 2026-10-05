import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import CategoryIcon from './CategoryIcon';
import useTransactions from '../hooks/useTransactions';
import { categoryColors } from '../data/categories';
import { formatCurrency } from '../utils/money';
import { fontFamily } from '../theme';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export default function PagedTransactionList({ accessToken, endpoint, header, emptyMessage, showSigns = false }) {
  const { rows, loading, error, hasNext, loadMore, retry } = useTransactions(accessToken, endpoint);
  return <FlatList data={rows} keyExtractor={item => item.id} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
    ListHeaderComponent={header} onEndReached={loadMore} onEndReachedThreshold={0.35} initialNumToRender={12} windowSize={7}
    renderItem={({ item, index }) => <TransactionRow row={item} showSigns={showSigns} showDate={index === 0 || rows[index - 1].date !== item.date} />}
    ListEmptyComponent={!loading && !error ? <View style={s.feedback}><Text style={s.muted}>{emptyMessage}</Text></View> : null}
    ListFooterComponent={<>
      {loading && <View style={s.feedback}><ActivityIndicator color="#0666FF" /><Text style={s.muted}>Carregando…</Text></View>}
      {!!error && <View style={s.feedback}><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={s.action}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
      {hasNext && !loading && !error && <Pressable accessibilityRole="button" onPress={loadMore} style={s.action}><Text style={s.link}>Carregar mais transações</Text></Pressable>}
    </>} />;
}

function TransactionRow({ row, showDate, showSigns }) {
  const palette = categoryColors.find(color => color.key === row.color) || categoryColors.find(color => color.key === 'gray');
  const [year, month, day] = row.date.split('-');
  return <View>{showDate && <Text style={s.day}>{day} {months[Number(month) - 1].toUpperCase()} {year}</Text>}<View style={s.transaction}><View style={[s.tile, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} size={24} color={palette.foreground} /></View><View style={s.info}><Text numberOfLines={2} style={s.rowTitle}>{row.description}</Text><Text style={s.rowDetail}>{row.type === 'TRANSFER' ? 'Transferência' : row.type === 'INVOICE_PAYMENT' ? 'Pagamento de fatura' : row.category || 'Sem categoria'} · {row.payment}{row.installmentCount > 1 ? ' · Parcela ' + row.installmentNumber + '/' + row.installmentCount : ''}</Text></View><Text style={[s.rowAmount, row.type === 'INCOME' && s.green]}>{row.type === 'INCOME' ? '+ ' : showSigns && ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type) ? '− ' : ''}{formatCurrency(row.amount)}</Text></View></View>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28 }, day: { fontFamily, fontSize: 12, fontWeight: '600', color: '#828388', marginTop: 16, marginBottom: 8 }, transaction: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E4E6' }, tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, minWidth: 0, gap: 4 }, rowTitle: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111310' }, rowDetail: { fontFamily, fontSize: 11, lineHeight: 16, color: '#828388' }, rowAmount: { fontFamily, fontSize: 14, fontWeight: '600', color: '#111310', fontVariant: ['tabular-nums'] }, green: { color: '#116B34' }, feedback: { alignItems: 'center', paddingVertical: 30, gap: 12 }, muted: { fontFamily, fontSize: 13, lineHeight: 20, color: '#828388', textAlign: 'center' }, action: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' }, link: { fontFamily, fontSize: 14, color: '#0666FF', fontWeight: '600' },
});
