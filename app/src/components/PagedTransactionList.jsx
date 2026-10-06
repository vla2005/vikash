import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ListSkeleton } from './Skeleton';
import CategoryIcon from './CategoryIcon';
import useTransactions from '../hooks/useTransactions';
import { categoryColors } from '../data/categories';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily } from '../theme';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export default function PagedTransactionList({ accessToken, endpoint, header, emptyMessage, showSigns = false, onOpenTransaction }) {
  const { rows, loading, error, hasNext, loadMore, retry } = useTransactions(accessToken, endpoint);
  return <FlatList data={rows} keyExtractor={item => item.id} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
    ListHeaderComponent={header} onEndReached={loadMore} onEndReachedThreshold={0.35} initialNumToRender={12} windowSize={7}
    renderItem={({ item, index }) => <TransactionRow row={item} onOpen={onOpenTransaction} showSigns={showSigns} showDate={index === 0 || rows[index - 1].date !== item.date} />}
    ListEmptyComponent={!loading && !error ? <View style={s.feedback}><Text style={s.muted}>{emptyMessage}</Text></View> : null}
    ListFooterComponent={<>
      {loading && <ListSkeleton count={rows.length ? 2 : 5} label={rows.length ? 'Carregando mais lançamentos' : 'Carregando lançamentos'} />}
      {!!error && <View style={s.feedback}><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={s.action}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
      {hasNext && !loading && !error && <Pressable accessibilityRole="button" onPress={loadMore} style={s.action}><Text style={s.link}>Carregar mais transações</Text></Pressable>}
    </>} />;
}

function TransactionRow({ row, showDate, showSigns, onOpen }) {
  const palette = categoryColors.find(color => color.key === row.color) || categoryColors.find(color => color.key === 'gray');
  const [year, month, day] = row.date.split('-');
  return <View>{showDate && <Text style={s.day}>{day} {months[Number(month) - 1].toUpperCase()} {year}</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`Abrir lançamento ${row.description}`} onPress={() => onOpen?.(row)} style={s.transaction}><View style={[s.tile, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} size={24} color={palette.foreground} /></View><View style={s.info}><Text numberOfLines={2} style={s.rowTitle}>{row.description}</Text><Text style={s.rowDetail}>{row.type === 'TRANSFER' ? 'Transferência' : row.type === 'INVOICE_PAYMENT' ? 'Pagamento de fatura' : row.category || 'Sem categoria'} · {row.payment}{row.installmentCount > 1 ? ' · Parcela ' + row.installmentNumber + '/' + row.installmentCount : ''}</Text></View><Text style={[s.rowAmount, row.type === 'INCOME' && s.green]}>{row.type === 'INCOME' ? '+ ' : showSigns && ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type) ? '− ' : ''}{formatCurrency(row.amount)}</Text></Pressable></View>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28 }, day: { fontFamily: fontFamilyMedium, fontSize: 12, fontWeight: '600', color: colors.secondary, marginTop: 16, marginBottom: 8 }, transaction: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, minWidth: 0, gap: 4 }, rowTitle: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text }, rowDetail: { fontFamily, fontSize: 11, lineHeight: 16, color: colors.secondary }, rowAmount: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }, green: { color: colors.positive }, feedback: { alignItems: 'center', paddingVertical: 30, gap: 12 }, muted: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, textAlign: 'center' }, action: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' }, link: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.primary, fontWeight: '600' },
});
