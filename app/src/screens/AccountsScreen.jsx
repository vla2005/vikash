import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily } from '../theme';

export default function AccountsScreen({ accounts, profile, loading, error, onRetry, onCreate, onEdit, onArchived }) {
  const initials = (profile?.name || '').trim().split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, index, items) => index === 0 || index === items.length - 1).join('').toUpperCase() || 'V';
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRetry} tintColor="#0666FF" colors={['#0666FF']} />}>
    <View style={styles.header}><BrandLogo width={116} /><View accessibilityLabel={profile?.name || 'Seu perfil'} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View></View>
    <Text accessibilityRole="header" style={styles.title}>Contas</Text>
    <View style={styles.total}><Text style={styles.totalLabel}>Saldo em contas</Text><Text accessibilityLabel="Saldo total em contas" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.totalAmount}>{loading || error ? '—' : formatCurrency(total)}</Text></View>
    {loading ? <View style={styles.feedback}><ActivityIndicator color="#0666FF" /><Text style={styles.feedbackText}>Carregando suas contas...</Text></View> : error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.feedbackText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar contas novamente" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View> : accounts.length ? <View style={styles.list}>{accounts.map((account, index) => {
      const type = getAccountType(account.type);
      return <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Editar conta ${account.description}`} onPress={() => onEdit(account)} style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}>
        <View style={styles.logo}><InstitutionLogo institution={account.financialInstitution} size={46} fallbackIcon={account.type === 'CARTEIRA' ? 'wallet' : type.icon} fallbackColor="#414542" backgroundColor={account.financialInstitution ? '#FFFFFF' : '#F0EFEB'} /></View>
        <View style={styles.info}><Text numberOfLines={1} style={styles.name}>{account.description}</Text><Text numberOfLines={1} style={styles.type}>{type.label}</Text></View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.balance, account.balance > 0 && styles.positive, account.balance < 0 && styles.negative]}>{formatCurrency(account.balance)}</Text><Icon name="chevron" size={18} color="#929498" />
      </Pressable>;
    })}</View> : <View style={styles.feedback}><Icon name="wallet" size={36} color={colors.secondary} /><Text style={styles.emptyTitle}>Suas contas começam aqui</Text><Text style={styles.feedbackText}>Adicione uma conta para acompanhar seu saldo.</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Nova conta" onPress={onCreate} style={({ pressed }) => [styles.create, pressed && styles.pressed]}><Icon name="plus" size={25} color="#FFFFFF" /><Text style={styles.createText}>Nova conta</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Contas arquivadas" onPress={onArchived} style={({ pressed }) => [styles.archived, pressed && styles.pressed]}><Icon name="archive" size={25} color="#626663" /><Text style={styles.archivedText}>Contas arquivadas</Text><Icon name="chevron" size={19} color="#929498" /></Pressable>
    <Text style={styles.hint}>Toque em uma conta para editar.</Text>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 34 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1CEC7', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  title: { fontFamily, fontSize: 36, lineHeight: 44, fontWeight: '700', letterSpacing: -1.2, color: '#111310' },
  total: { marginTop: 22, marginBottom: 24, gap: 4 },
  totalLabel: { fontFamily, fontSize: 16, color: '#828388' },
  totalAmount: { fontFamily, fontSize: 44, lineHeight: 53, fontWeight: '700', letterSpacing: -1.7, color: '#111310', fontVariant: ['tabular-nums'] },
  list: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 77, paddingVertical: 14 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E6' },
  logo: { width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F0EFEB' },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily, fontSize: 16, fontWeight: '600', color: '#111310' },
  type: { fontFamily, fontSize: 13, color: '#828388' },
  balance: { fontFamily, fontSize: 17, fontWeight: '600', color: '#111310', maxWidth: '39%', fontVariant: ['tabular-nums'] },
  positive: { color: '#175E14' },
  negative: { color: '#B33D39' },
  create: { marginTop: 18, backgroundColor: '#0666FF', borderRadius: 14, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  createText: { fontFamily, fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  archived: { marginTop: 25, minHeight: 54, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 18 },
  archivedText: { flex: 1, fontFamily, fontSize: 16, color: '#111310', fontWeight: '500' },
  hint: { marginTop: 18, fontFamily, fontSize: 12, lineHeight: 18, color: '#828388' },
  feedback: { borderRadius: 16, padding: 24, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  feedbackText: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.secondary, textAlign: 'center' },
  emptyTitle: { fontFamily, fontSize: 17, fontWeight: '600', color: colors.text },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  retryText: { fontFamily, fontSize: 15, fontWeight: '600', color: '#0666FF' },
  pressed: { opacity: 0.7 },
});
