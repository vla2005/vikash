import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import AccountRow from '../components/AccountRow';
import { useOnboarding } from '../contexts/OnboardingContext';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, typography } from '../theme';

export default function AccountsSummaryScreen({ navigation }) {
  const { accounts, completed, completeSetup, profile, reset } = useOnboarding();
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  function backToLogin() { reset(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }
  function startUsing() { completeSetup(); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); }
  return <Screen>
    <View style={styles.header}><BrandLogo /><Text style={styles.step}>{completed ? 'Tudo pronto' : '2 de 2'}</Text></View>
    <View style={styles.check}><Icon name="check" color={colors.primary} size={30} /></View>
    <View style={styles.heading}><Text accessibilityRole="header" style={typography.title}>{completed ? `Tudo pronto${profile.name ? `, ${profile.name.split(' ')[0]}` : ''}.` : 'Suas contas, do seu jeito.'}</Text><Text style={typography.body}>{completed ? 'Suas contas estão organizadas.' : 'Adicione outras contas ou comece agora.'}</Text></View>
    {accounts.length ? <View style={styles.list}>{accounts.map((account, index) => <AccountRow key={account.uuid} account={account} last={index === accounts.length - 1} onPress={() => navigation.navigate('CreateAccount', { accountUuid: account.uuid })} />)}</View> : <View style={styles.empty}><Icon name="wallet" size={38} color={colors.secondary} /><Text style={styles.emptyTitle}>Sua primeira conta começa aqui.</Text><Text style={typography.body}>Adicione uma conta para organizar seu saldo.</Text></View>}
    <PrimaryButton title="Adicionar outra conta" onPress={() => navigation.push('CreateAccount', { accountUuid: null })} outlined icon="plus" style={styles.add} />
    <View style={styles.total}><Text style={typography.label}>Saldo inicial total</Text><Text style={styles.amount}>{formatCurrency(total)}</Text></View>
    <View style={styles.bottom}>
      {completed ? <Pressable accessibilityRole="button" onPress={backToLogin} style={styles.exit}><Text style={styles.exitText}>Voltar ao login</Text></Pressable> : <PrimaryButton title="Começar a usar" disabled={!accounts.length} onPress={startUsing} />}
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { color: colors.secondary, fontFamily, fontSize: 13 },
  check: { marginTop: 30, height: 48, width: 48, backgroundColor: colors.primarySoft, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 20, gap: 10 },
  list: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, marginTop: 28 },
  add: { marginTop: 18 },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 26, paddingTop: 22, gap: 8 },
  amount: { color: colors.text, fontFamily, fontSize: 36, lineHeight: 44, letterSpacing: -1.2, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bottom: { marginTop: 48 },
  empty: { marginTop: 26, paddingVertical: 20, gap: 12 },
  emptyTitle: { color: colors.text, fontFamily, fontSize: 18, fontWeight: '600' },
  exit: { alignSelf: 'center', padding: 14 },
  exitText: { color: colors.primary, fontFamily, fontSize: 15 },
});
