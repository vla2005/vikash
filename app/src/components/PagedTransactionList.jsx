import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ListSkeleton } from './Skeleton';
import CategoryIcon from './CategoryIcon';
import useTransactions from '../hooks/useTransactions';
import useTransactionDeletion from '../hooks/useTransactionDeletion';
import SwipeableRow from './SwipeableRow';
import ConfirmationDialog from './ConfirmationDialog';
import { categoryColors } from '../data/categories';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily } from '../theme';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export default function PagedTransactionList({ accessToken, endpoint, header, emptyMessage, showSigns = false, onOpenTransaction, onDeleted }) {
  const { rows, loading, error, hasNext, loadMore, retry, reload } = useTransactions(accessToken, endpoint);
  const [openRow, setOpenRow] = useState(null);
  const deletion = useTransactionDeletion(accessToken, () => { reload(); onDeleted?.(); });
  return <><FlatList data={rows} keyExtractor={item => item.id} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
    onScrollBeginDrag={() => setOpenRow(null)}
    ListHeaderComponent={header} onEndReached={loadMore} onEndReachedThreshold={0.35} initialNumToRender={12} windowSize={7}
    renderItem={({ item, index }) => <TransactionRow row={item} onOpen={onOpenTransaction} showSigns={showSigns} showDate={index === 0 || rows[index - 1].date !== item.date}
      lastOfDay={index === rows.length - 1 || rows[index + 1].date !== item.date}
      open={openRow === item.id} onOpenChange={open => setOpenRow(open ? item.id : null)} onDelete={() => { setOpenRow(null); deletion.requestDelete(item); }} />}
    ListEmptyComponent={!loading && !error ? <View style={s.feedback}><Text style={s.muted}>{emptyMessage}</Text></View> : null}
    ListFooterComponent={<>
      {loading && <ListSkeleton count={rows.length ? 2 : 5} label={rows.length ? 'Carregando mais lançamentos' : 'Carregando lançamentos'} />}
      {!!error && <View style={s.feedback}><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={s.action}><Text style={s.link}>Tentar novamente</Text></Pressable></View>}
      {hasNext && !loading && !error && <Pressable accessibilityRole="button" onPress={loadMore} style={s.action}><Text style={s.link}>Carregar mais transações</Text></Pressable>}
    </>} /><ConfirmationDialog {...deletion.dialogProps} /></>;
}

function TransactionRow({ row, showDate, lastOfDay, showSigns, onOpen, open, onOpenChange, onDelete }) {
  const palette = categoryColors.find(color => color.key === row.color) || categoryColors.find(color => color.key === 'gray');
  const [year, month, day] = row.date.split('-');
  return <View>{showDate && <Text style={s.day}>{day} {months[Number(month) - 1].toUpperCase()} {year}</Text>}<SwipeableRow label={`Abrir lançamento ${row.description}`} actionLabel={`Excluir ${row.purchaseUuid ? 'compra' : 'transação'} ${row.description}`}
    containerStyle={[showDate && s.firstRow, lastOfDay && s.lastRow]}
    open={open} onOpenChange={onOpenChange} onAction={onDelete} onPress={() => onOpen?.(row)} style={s.transaction}><View style={[s.tile, { backgroundColor: palette.background }]}><CategoryIcon name={row.icon || 'wallet'} size={24} color={palette.foreground} /></View><View style={s.info}><Text numberOfLines={2} style={s.rowTitle}>{row.description}</Text><Text style={s.rowDetail}>{row.type === 'TRANSFER' ? 'Transferência' : row.type === 'INVOICE_PAYMENT' ? 'Pagamento de fatura' : row.category || 'Sem categoria'} · {row.payment}{row.installmentCount > 1 ? ' · Parcela ' + row.installmentNumber + '/' + row.installmentCount : ''}</Text></View><Text style={[s.rowAmount, row.type === 'INCOME' && s.green]}>{row.type === 'INCOME' ? '+ ' : showSigns && ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type) ? '− ' : ''}{formatCurrency(row.amount)}</Text></SwipeableRow></View>;
}
const s = StyleSheet.create({
  firstRow: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  lastRow: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  content: { paddingHorizontal: 22, paddingBottom: 28 }, day: { fontFamily: fontFamilyMedium, fontSize: 12, fontWeight: '600', color: colors.secondary, marginTop: 16, marginBottom: 8 }, transaction: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, info: { flex: 1, minWidth: 0, gap: 4 }, rowTitle: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text }, rowDetail: { fontFamily, fontSize: 11, lineHeight: 16, color: colors.secondary }, rowAmount: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }, green: { color: colors.positive }, feedback: { alignItems: 'center', paddingVertical: 30, gap: 12 }, muted: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, textAlign: 'center' }, action: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' }, link: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.primary, fontWeight: '600' },
});
