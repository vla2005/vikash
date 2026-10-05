import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import CreditCardSummary from '../components/CreditCardSummary';
import SegmentedControl from '../components/SegmentedControl';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, colors, fontFamily, fontFamilyBold } from '../theme';

export default function AccountsScreen({ accounts, profile, loading, error, onRetry, onCreate, onEdit, cards = [], cardsLoading = false, cardsError = '', onRetryCards, onCreateCard, onOpenCard }) {
  const [section, setSection] = useState('accounts');
  const initials = (profile?.name || '').trim().split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, index, items) => index === 0 || index === items.length - 1).join('').toUpperCase() || 'V';
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  function feedback(busy, message, retry, retryLabel, title, description) {
    return <View style={s.feedback}>{busy ? <><ActivityIndicator color={colors.primary} /><Text style={s.caption}>Carregando…</Text></> : message ? <><Text accessibilityRole="alert" style={s.caption}>{message}</Text><Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={retry} style={s.retry}><Text style={s.link}>Tentar novamente</Text></Pressable></> : <><Icon name="wallet" size={30} color={colors.primary} /><Text style={s.emptyTitle}>{title}</Text><Text style={s.caption}>{description}</Text></>}</View>;
  }
  function creditCards() {
    return <View style={s.panel}>
      <View style={s.sectionHeader}><View style={s.sectionCopy}><Text accessibilityRole="header" style={s.sectionTitle}>Cartões de crédito</Text><Text style={s.caption}>Suas faturas e limites</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Novo cartão" onPress={onCreateCard} style={({ pressed }) => [s.add, pressed && s.pressed]}><Icon name="plus" size={21} color={colors.primary} /><Text style={s.link}>Novo cartão</Text></Pressable>
      </View>
      {cardsLoading || cardsError || !cards.length ? feedback(cardsLoading, cardsError, onRetryCards, 'Tentar carregar cartões novamente', 'Seu primeiro cartão começa aqui', 'Organize suas faturas e seu limite de crédito.') : cards.map(card => <CreditCardSummary key={card.uuid} card={card} onInvoice={() => onOpenCard?.(card.uuid)} />)}
    </View>;
  }
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading || cardsLoading} onRefresh={() => { onRetry(); onRetryCards?.(); }} tintColor={colors.primary} colors={[colors.primary]} />}>
    <View style={s.header}><BrandLogo width={126} /><View accessibilityLabel={profile?.name || 'Seu perfil'} style={s.avatar}><Text style={s.initials}>{initials}</Text></View></View>
    <Text accessibilityRole="header" style={s.title}>Contas e cartões</Text><Text style={s.subtitle}>Seu dinheiro, do seu jeito.</Text>
    <View style={s.workspace}>
      <SegmentedControl value={section} onChange={setSection} options={[{ value: 'accounts', label: 'Contas', accessibilityLabel: 'Mostrar contas' }, { value: 'cards', label: 'Cartões', accessibilityLabel: 'Mostrar cartões' }]} />
      {section === 'accounts' ? <>
        <View style={s.total}><View style={s.sectionCopy}><Text style={s.sectionTitle}>Seu dinheiro</Text><Text style={s.caption}>Saldo em contas</Text></View><Text accessibilityLabel="Saldo total em contas" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={s.totalAmount}>{loading || error ? '—' : formatCurrency(total)}</Text></View>
        {loading || error || !accounts.length ? feedback(loading, error, onRetry, 'Tentar carregar contas novamente', 'Suas contas começam aqui', 'Adicione uma conta para acompanhar seu saldo.') : accounts.map(account => {
          const type = getAccountType(account.type);
          return <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Abrir conta ${account.description}`} onPress={() => onEdit(account)} style={({ pressed }) => [s.row, pressed && s.pressed]}>
            <InstitutionLogo institution={account.financialInstitution} size={43} fallbackIcon={type.icon} backgroundColor={account.financialInstitution ? colors.surface : colors.surfaceMuted} fallbackColor={colors.text} />
            <View style={s.info}><Text numberOfLines={1} style={s.name}>{account.description}</Text><Text numberOfLines={1} style={s.caption}>{type.label}</Text></View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[s.balance, account.balance > 0 && s.positive, account.balance < 0 && s.negative]}>{formatCurrency(account.balance)}</Text><Icon name="chevron" size={17} color={colors.secondary} />
          </Pressable>;
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="Nova conta" onPress={onCreate} style={({ pressed }) => [s.create, pressed && s.pressed]}><Icon name="plus" size={23} color={colors.surface} /><Text style={s.createText}>Nova conta</Text></Pressable>
      </> : <View style={s.cardsOnly}>{creditCards()}</View>}
    </View>
    {section === 'accounts' && creditCards()}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 28, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingHorizontal: 6 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCE3FF', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontSize: 15, fontWeight: '700', color: colors.text },
  title: { fontFamily: fontFamilyBold, fontSize: 29, lineHeight: 38, letterSpacing: -1.1, color: colors.text, fontWeight: '700', marginHorizontal: 6 },
  subtitle: { fontFamily, fontSize: 14, lineHeight: 22, color: colors.secondary, marginTop: -4, marginBottom: 4, marginHorizontal: 6 },
  workspace: { backgroundColor: colors.surface, borderRadius: 25, padding: 12 },
  panel: { backgroundColor: colors.surface, borderRadius: 25, padding: 12 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  totalAmount: { fontFamily: fontFamilyBold, fontSize: 20, fontWeight: '700', color: colors.positive, fontVariant: ['tabular-nums'], maxWidth: '53%', letterSpacing: -0.7 },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontFamily: fontFamilyBold, fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  caption: { fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text },
  balance: { fontFamily: fontFamilyBold, fontSize: 14, fontWeight: '700', color: colors.text, maxWidth: '34%', fontVariant: ['tabular-nums'] },
  positive: { color: colors.positive }, negative: { color: colors.negative },
  create: { backgroundColor: colors.primary, minHeight: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 6 },
  createText: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 5 },
  link: { fontFamily: fontFamilyMedium, fontSize: 12, fontWeight: '600', color: colors.primary },
  feedback: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyTitle: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center' },
  retry: { padding: 12 }, pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  cardsOnly: { marginHorizontal: -12, marginBottom: -12, marginTop: 8 },
});
