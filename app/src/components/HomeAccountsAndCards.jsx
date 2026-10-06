import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import HomeCreditCards from './HomeCreditCards';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function HomeAccountsAndCards({ accounts = [], cards = [], profile, onOpenAccount, onOpenCard, onViewAll }) {
  return <View style={s.section}>
    <View style={s.heading}>
      <Text accessibilityRole="header" style={s.title}>Minhas contas e cartões</Text>
      {!!onViewAll && <Pressable accessibilityRole="button" accessibilityLabel="Ver todas as contas e cartões" onPress={onViewAll}
        style={({ pressed }) => [s.all, pressed && s.pressed]}><Text style={s.link}>Ver todos</Text><Icon name="chevron" size={16} color={colors.primary} /></Pressable>}
    </View>
    <Text accessibilityRole="header" style={s.subtitle}>Contas</Text>
    <View style={s.accounts}>
      {accounts.length ? accounts.map((account, index) => {
        const type = getAccountType(account.type);
        return <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Abrir conta ${account.description}`}
          accessibilityState={{ disabled: !onOpenAccount }} disabled={!onOpenAccount} onPress={() => onOpenAccount(account.uuid)}
          style={({ pressed }) => [s.row, index > 0 && s.divider, pressed && s.pressed]}>
          <InstitutionLogo institution={account.financialInstitution} size={40} fallbackIcon={type.icon}
            backgroundColor={account.financialInstitution ? colors.surface : colors.surfaceMuted} />
          <View style={s.copy}><Text style={s.name}>{account.description}</Text><Text style={s.type}>{type.label}</Text></View>
          <View style={s.amountGroup}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
            style={[s.amount, account.balance > 0 && s.positive, account.balance < 0 && s.negative]}>{formatCurrency(account.balance)}</Text>
          {!!onOpenAccount && <Icon name="chevron" size={16} color={colors.secondary} />}</View>
        </Pressable>;
      }) : <View style={s.empty}><Icon name="wallet" size={28} color={colors.primary} /><View style={s.copy}>
        <Text style={s.name}>Suas contas aparecem aqui</Text><Text style={s.type}>Adicione uma conta para acompanhar seu saldo.</Text>
      </View></View>}
    </View>
    <HomeCreditCards cards={cards} profile={profile} onOpenCard={onOpenCard} title="Cartões de crédito" compactHeading />
  </View>;
}

const s = StyleSheet.create({
  section: { marginTop: 26 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 22, lineHeight: 29, letterSpacing: -0.7, color: colors.text },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  link: { fontFamily: fontFamilyMedium, fontSize: 12, color: colors.primary },
  subtitle: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 17, color: colors.text, marginBottom: 12 },
  accounts: { backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 78, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 19, color: colors.text },
  type: { fontFamily, fontSize: 11, lineHeight: 17, color: colors.secondary },
  amountGroup: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '42%' },
  amount: { flexShrink: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  positive: { color: colors.positive }, negative: { color: colors.negative },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22 },
  pressed: { opacity: 0.7 },
});
