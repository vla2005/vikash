import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import HomeAccountRow from './HomeAccountRow';
import HomeCreditCards from './HomeCreditCards';
import Icon from './Icon';
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
      {accounts.length ? accounts.slice(0, 3).map((account, index) => <View key={account.uuid}>
        {index > 0 && <View style={s.separator} />}
        <HomeAccountRow account={account} hidden={hidden} onOpen={onOpenAccount} />
      </View>) : <Text style={s.empty}>Adicione uma conta para acompanhar seu saldo.</Text>}
      {accounts.length > 3 && <Text style={s.note}>Até 3 contas. Acesse “Ver todos” para a lista completa.</Text>}
    </View>
    <HomeCreditCards cards={cards} profile={profile} hidden={hidden} onOpenCard={onOpenCard} title="Cartões de crédito" compactHeading />
  </View>;
}
const s = StyleSheet.create({
  section: { marginTop: 24 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }, link: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.primary },
  panel: { backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  subtitle: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 21, color: colors.secondary, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 },
  empty: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, paddingVertical: 12 },
  note: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary, paddingBottom: 16 },
});
