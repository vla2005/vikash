import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import CreditCardSummary from '../components/CreditCardSummary';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily } from '../theme';

export default function AccountsScreen({ accounts, profile, loading, error, onRetry, onCreate, onEdit, cards = [], cardsLoading = false, cardsError = '', onRetryCards, onCreateCard, onOpenCard }) {
  const initials = (profile?.name || '').trim().split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, index, items) => index === 0 || index === items.length - 1).join('').toUpperCase() || 'V';
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  return <><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading || cardsLoading} onRefresh={() => { onRetry(); onRetryCards?.(); }} tintColor="#0666FF" colors={['#0666FF']} />}>
    <View style={styles.header}><BrandLogo width={116} /><View accessibilityLabel={profile?.name || 'Seu perfil'} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View></View>
    <Text accessibilityRole="header" style={styles.title}>Contas e cartões</Text>
    <View style={styles.total}><Text style={styles.totalLabel}>Saldo em contas</Text><Text accessibilityLabel="Saldo total em contas" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.totalAmount}>{loading || error ? '—' : formatCurrency(total)}</Text></View>
    <Text accessibilityRole="header" style={styles.sectionTitle}>Contas</Text>
    {loading ? <View style={styles.feedback}><ActivityIndicator color="#0666FF" /><Text style={styles.feedbackText}>Carregando suas contas...</Text></View> : error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.feedbackText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar contas novamente" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View> : accounts.length ? <View style={styles.list}>{accounts.map((account, index) => {
      const type = getAccountType(account.type);
      return <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Abrir conta ${account.description}`} onPress={() => onEdit(account)} style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}>
        <View style={styles.logo}><InstitutionLogo institution={account.financialInstitution} size={46} fallbackIcon={account.type === 'CARTEIRA' ? 'wallet' : type.icon} fallbackColor="#414542" backgroundColor={account.financialInstitution ? '#FFFFFF' : '#F0EFEB'} /></View>
        <View style={styles.info}><Text numberOfLines={1} style={styles.name}>{account.description}</Text><Text numberOfLines={1} style={styles.type}>{type.label}</Text></View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.balance, account.balance > 0 && styles.positive, account.balance < 0 && styles.negative]}>{formatCurrency(account.balance)}</Text><Icon name="chevron" size={18} color="#929498" />
      </Pressable>;
    })}</View> : <View style={styles.feedback}><Icon name="wallet" size={36} color={colors.secondary} /><Text style={styles.emptyTitle}>Suas contas começam aqui</Text><Text style={styles.feedbackText}>Adicione uma conta para acompanhar seu saldo.</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Nova conta" onPress={onCreate} style={({ pressed }) => [styles.create, styles.outlined, pressed && styles.pressed]}><Icon name="plus" size={22} color="#0666FF" /><Text style={[styles.createText, styles.outlinedText]}>Nova conta</Text></Pressable>
    <Text accessibilityRole="header" style={[styles.sectionTitle, styles.cardsTitle]}>Cartões de crédito</Text>
    {cardsLoading ? <View style={styles.feedback}><ActivityIndicator color="#0666FF" /><Text style={styles.feedbackText}>Carregando seus cartões...</Text></View>
      : cardsError ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.feedbackText}>{cardsError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar cartões novamente" onPress={onRetryCards} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View>
        : cards.length ? cards.map(card => <CreditCardSummary key={card.uuid} card={card} onInvoice={() => onOpenCard?.(card.uuid)} />)
          : <View style={styles.feedback}><Icon name="creditCard" size={36} color={colors.secondary} /><Text style={styles.emptyTitle}>Seu primeiro cartão começa aqui</Text><Text style={styles.feedbackText}>Organize suas faturas e seu limite de crédito.</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Novo cartão" onPress={onCreateCard} style={({ pressed }) => [styles.create, pressed && styles.pressed]}><Icon name="plus" size={22} color="#FFFFFF" /><Text style={styles.createText}>Novo cartão</Text></Pressable>
  </ScrollView></>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 34 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1CEC7', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  title: { fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2, color: '#111310' },
  sectionTitle: { fontFamily, fontSize: 20, fontWeight: '700', color: '#111310', marginBottom: 14 },
  cardsTitle: { marginTop: 30, marginBottom: 2 },
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
  outlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#0666FF' },
  outlinedText: { color: '#0666FF' },
  feedback: { borderRadius: 16, padding: 24, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 },
  feedbackText: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.secondary, textAlign: 'center' },
  emptyTitle: { fontFamily, fontSize: 17, fontWeight: '600', color: colors.text },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  retryText: { fontFamily, fontSize: 15, fontWeight: '600', color: '#0666FF' },
  pressed: { opacity: 0.7 },
});
