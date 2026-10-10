import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import InstitutionLogo from './InstitutionLogo';
import HomeCreditCards from './HomeCreditCards';
import Icon from './Icon';
import { getAccountType } from '../constants/accountTypes';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function HomeAccountsAndCards({ accounts = [], cards = [], profile, hidden, onOpenAccount, onOpenCard, onViewAll }) {
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Minhas contas e cartões</Text>
      {!!onViewAll && <Pressable accessibilityRole="button" accessibilityLabel="Ver todas as contas e cartões" onPress={onViewAll} style={s.all}>
        <Text style={s.link}>Ver todos</Text><Icon name="chevron" size={16} color={colors.primary} />
      </Pressable>}
    </View>
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.subtitle}>Contas</Text>
      {accounts.length ? accounts.slice(0, 3).map(account => {
        const type = getAccountType(account.type);
        return <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Abrir conta ${account.description}`}
          disabled={!onOpenAccount} onPress={() => onOpenAccount(account.uuid)} style={({ pressed }) => [s.row, pressed && s.pressed]}>
          <InstitutionLogo institution={account.financialInstitution} size={34} fallbackIcon={type.icon}
            backgroundColor={account.financialInstitution ? colors.surface : colors.surfaceMuted} />
          <View style={s.copy}><Text numberOfLines={2} style={s.name}>{account.description}</Text><Text style={s.caption}>{type.label}</Text></View>
          <Text style={s.amount}>{hidden ? hiddenAmount : formatCurrency(account.balance)}</Text>
          <Icon name="chevron" size={16} color={colors.secondary} />
        </Pressable>;
      }) : <Text style={s.empty}>Adicione uma conta para acompanhar seu saldo.</Text>}
      {accounts.length > 3 && <Text style={s.note}>Até 3 contas. Acesse “Ver todos” para a lista completa.</Text>}
    </View>
    <HomeCreditCards cards={cards} profile={profile} hidden={hidden} onOpenCard={onOpenCard} title="Cartões de crédito" compactHeading />
  </View>;
}
const s = StyleSheet.create({
  section: { marginTop: 24 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }, link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
  panel: { backgroundColor: colors.surface, borderRadius: 22, padding: 16 }, subtitle: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.secondary, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  copy: { flex: 1, minWidth: 0, gap: 4 }, name: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.text },
  caption: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary }, amount: { maxWidth: '35%', flexShrink: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 14, lineHeight: 21, color: colors.text },
  empty: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, paddingVertical: 12 },
  note: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, paddingTop: 14 }, pressed: { opacity: 0.7 },
});
