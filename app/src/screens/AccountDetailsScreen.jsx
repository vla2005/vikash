import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import PagedTransactionList from '../components/PagedTransactionList';
import useAccountDetails from '../hooks/useAccountDetails';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { fontFamily } from '../theme';

export default function AccountDetailsScreen({ uuid, accessToken, onBack, onEdit, revision = 0 }) {
  const { account, loading, error, retry } = useAccountDetails(uuid, accessToken, revision);
  const type = account ? getAccountType(account.type) : null;
  const header = <>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Voltar para contas e cartões" onPress={onBack} style={s.action}><Icon name="back" size={24} /></Pressable><Text accessibilityRole="header" style={s.navTitle}>Detalhes da conta</Text><View style={s.action} /></View>
    {account && <>
      <View style={s.identity}><InstitutionLogo institution={account.financialInstitution} size={52} fallbackIcon={type.icon} /><View style={s.info}><Text style={s.title}>{account.description}</Text><Text style={s.muted}>{account.financialInstitution?.name || type.label}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar conta" onPress={() => onEdit(account)} style={({ pressed }) => [s.action, pressed && s.pressed]}><Icon name="edit" size={25} color="#111310" /></Pressable></View>
      <View style={s.panel}><Text style={s.muted}>Saldo atual</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.balance, account.balance > 0 && s.green, account.balance < 0 && s.negative]}>{formatCurrency(account.balance)}</Text><View style={s.detailRow}><Text style={s.muted}>Tipo de conta</Text><Text style={s.detail}>{type.label}</Text></View>{account.type !== 'CARTEIRA' && <View style={s.detailRow}><Text style={s.muted}>Instituição</Text><Text style={s.detail}>{account.financialInstitution?.name || 'Não informada'}</Text></View>}</View>
      <Text accessibilityRole="header" style={s.sectionTitle}>Transações da conta</Text><Text style={s.subtitle}>Histórico de movimentações desta conta</Text>
    </>}
  </>;
  return account ? <PagedTransactionList key={`${uuid}-${revision}`} accessToken={accessToken} endpoint={`/api/account/${encodeURIComponent(uuid)}/transactions`} header={header} showSigns emptyMessage="Esta conta ainda não tem transações." />
    : <ScrollView contentContainerStyle={s.content}>{header}<View style={s.feedback}>{loading ? <ActivityIndicator color="#0666FF" /> : <><Text accessibilityRole="alert" style={s.muted}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={s.action}><Text style={s.link}>Tentar novamente</Text></Pressable></>}</View></ScrollView>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28 }, nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }, action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, navTitle: { fontFamily, fontSize: 18, fontWeight: '600', color: '#111310' }, identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18, marginBottom: 24 }, info: { flex: 1, gap: 6 }, title: { fontFamily, fontSize: 23, fontWeight: '700', color: '#111310' }, muted: { fontFamily, fontSize: 13, lineHeight: 20, color: '#828388' }, panel: { padding: 16, borderRadius: 16, backgroundColor: '#FFF' }, balance: { fontFamily, fontSize: 36, lineHeight: 46, fontWeight: '700', color: '#111310', marginTop: 4, marginBottom: 16, fontVariant: ['tabular-nums'] }, green: { color: '#116B34' }, negative: { color: '#B33D39' }, detailRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E6', paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, detail: { fontFamily, fontSize: 14, color: '#111310', flexShrink: 1, textAlign: 'right' }, link: { fontFamily, fontSize: 15, fontWeight: '600', color: '#0666FF' }, sectionTitle: { fontFamily, fontSize: 22, fontWeight: '700', color: '#111310', marginTop: 28 }, subtitle: { fontFamily, fontSize: 13, color: '#828388', marginTop: 6, marginBottom: 6 }, feedback: { paddingVertical: 32, alignItems: 'center', gap: 12 }, pressed: { opacity: 0.7 },
});
