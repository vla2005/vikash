import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import FormField from '../components/FormField';
import AccountTypePicker from '../components/AccountTypePicker';
import FinancialInstitutionPicker from '../components/FinancialInstitutionPicker';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import InlineNotice from '../components/InlineNotice';
import { useOnboarding } from '../contexts/OnboardingContext';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils/money';
import { colors, fontFamily, typography } from '../theme';

export default function CreateAccountScreen({ navigation, route }) {
  const { accounts, saveAccount } = useOnboarding();
  const editing = accounts.find(account => account.id === route.params?.accountId);
  const [name, setName] = useState(editing?.name || '');
  const [balance, setBalance] = useState(formatCurrency(editing?.balance || 0));
  const [type, setType] = useState(editing?.type || 'CONTA_CORRENTE');
  const [financialInstitutionId, setFinancialInstitutionId] = useState(editing?.financialInstitutionId || null);
  const [financialInstitution, setFinancialInstitution] = useState(editing?.financialInstitution || null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const submitting = useRef(false);
  const balanceRef = useRef(null);
  async function submit() {
    if (submitting.current) { return; }
    const next = {};
    if (name.trim().length < 2) { next.name = 'Informe uma descrição para sua conta.'; }
    if (parseCurrency(balance) > 9999999999999.99) { next.balance = 'Informe um saldo menor.'; }
    setErrors(next);
    if (Object.keys(next).length) { return; }
    submitting.current = true;
    setLoading(true);
    setRequestError('');
    try {
      await saveAccount({ name: name.trim(), type, balance: parseCurrency(balance), financialInstitutionId: type === 'CARTEIRA' ? null : financialInstitutionId }, editing?.id);
      navigation.reset({ index: 0, routes: [{ name: 'Accounts' }] });
    } catch (cause) {
      setRequestError(cause.message);
      setErrors({ ...cause.fieldErrors, name: cause.fieldErrors?.description });
    } finally { submitting.current = false; setLoading(false); }
  }
  return <Screen>
    <View style={styles.header}>
      <BrandLogo />
      {accounts.length ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar às contas" hitSlop={12} onPress={() => navigation.goBack()}><Icon name="close" color={colors.secondary} /></Pressable> : <View style={styles.progress}><Text style={styles.step}>1 de 2</Text><View style={styles.track}><View style={styles.progressBar} /></View></View>}
    </View>
    <View style={styles.heading}><Text accessibilityRole="header" style={typography.title}>{editing ? 'Editar sua conta.' : 'Onde seu dinheiro fica?'}</Text><Text style={typography.body}>{editing ? 'Ajuste os dados como preferir.' : accounts.length ? 'Adicione mais uma conta para se organizar.' : 'Crie sua primeira conta para começar.'}</Text></View>
    <View style={styles.form}>
      <AccountTypePicker value={type} onChange={setType} />
      {type !== 'CARTEIRA' && <FinancialInstitutionPicker value={financialInstitutionId} selectedInstitution={financialInstitution} onChange={(id, institution) => { setFinancialInstitutionId(id); setFinancialInstitution(institution); }} />}
      <FormField label="Descrição" placeholder="Ex.: Conta do dia a dia, reserva, carteira" value={name} onChangeText={value => { setName(value); setErrors(previous => ({ ...previous, name: undefined })); }} error={errors.name} maxLength={100} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => balanceRef.current?.focus()} testID="account-name" />
      <FormField ref={balanceRef} label="Saldo inicial" large value={balance} onChangeText={value => { setBalance(maskCurrency(value)); setErrors(previous => ({ ...previous, balance: undefined })); }} error={errors.balance} keyboardType="number-pad" maxLength={25} returnKeyType="done" testID="account-balance" />
    </View>
    <View style={styles.bottom}><InlineNotice message={requestError || (editing ? 'A edição de contas estará disponível em breve.' : '')} error={!!requestError} /><Text style={styles.hint}>Você pode editar tudo depois.</Text><PrimaryButton title={editing ? 'Salvar alterações' : 'Criar conta'} onPress={submit} loading={loading} disabled={!!editing} /></View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { alignItems: 'flex-end', gap: 7, width: 65 },
  step: { fontFamily, color: colors.secondary, fontSize: 13 },
  track: { width: 65, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  progressBar: { width: '50%', height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  heading: { marginTop: 32, gap: 10 },
  form: { marginTop: 30, gap: 25 },
  bottom: { marginTop: 30, gap: 22 },
  hint: { textAlign: 'center', fontFamily, color: colors.secondary, fontSize: 13, lineHeight: 18 },
});
