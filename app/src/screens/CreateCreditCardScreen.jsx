import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import FormField from '../components/FormField';
import FinancialInstitutionPicker from '../components/FinancialInstitutionPicker';
import InlineNotice from '../components/InlineNotice';
import PrimaryButton from '../components/PrimaryButton';
import useToast from '../hooks/useToast';
import { useOnboarding } from '../contexts/OnboardingContext';
import { createCreditCard, updateCreditCard } from '../services/creditCards';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils/money';
import { colors, fontFamily, typography } from '../theme';

export default function CreateCreditCardScreen({ navigation, onCancel, onCreated, card: existingCard }) {
  const editing = Boolean(existingCard?.uuid);
  const { showToast } = useToast();
  const { session } = useOnboarding();
  const [institution, setInstitution] = useState(existingCard?.financialInstitution?.id ?? null);
  const [selectedInstitution, setSelectedInstitution] = useState(existingCard?.financialInstitution ?? null);
  const [description, setDescription] = useState(existingCard?.description ?? '');
  const [limit, setLimit] = useState(formatCurrency(existingCard?.creditLimit ?? 0));
  const [closingDay, setClosingDay] = useState(existingCard ? String(existingCard.closingDay) : '');
  const [dueDay, setDueDay] = useState(existingCard ? String(existingCard.dueDay) : '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) { return; }
    const next = {};
    if (!institution) { next.institution = 'Selecione a instituição do cartão.'; }
    if (description.trim().length < 2) { next.description = 'Informe uma descrição para seu cartão.'; }
    if (parseCurrency(limit) <= 0 || parseCurrency(limit) > 9999999999999.99) { next.limit = 'Informe um limite válido maior que zero.'; }
    if (!/^\d{1,2}$/.test(closingDay) || Number(closingDay) < 1 || Number(closingDay) > 31) { next.closingDay = 'Informe um dia entre 1 e 31.'; }
    if (!/^\d{1,2}$/.test(dueDay) || Number(dueDay) < 1 || Number(dueDay) > 31) { next.dueDay = 'Informe um dia entre 1 e 31.'; }
    setErrors(next);
    if (Object.keys(next).length) { showToast({ type: 'warn', message: 'Confira os campos destacados.' }); return; }
    submitting.current = true;
    setLoading(true);
    setRequestError('');
    try {
      const values = { financialInstitutionId: institution, description, creditLimit: parseCurrency(limit), closingDay: Number(closingDay), dueDay: Number(dueDay) };
      if (editing) { await updateCreditCard(existingCard.uuid, values, session?.accessToken); }
      else { await createCreditCard(values, session?.accessToken); }
      showToast({ type: 'success', title: editing ? 'Cartão atualizado!' : 'Cartão criado!', message: 'Seu cartão de crédito foi salvo com sucesso.' });
      if (onCreated) { onCreated(); }
      else { navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); }
    } catch (cause) {
      setRequestError(cause.message);
      setErrors({ description: cause.fieldErrors?.description, institution: cause.fieldErrors?.financialInstitutionId, limit: cause.fieldErrors?.creditLimit, closingDay: cause.fieldErrors?.closingDay, dueDay: cause.fieldErrors?.dueDay });
      showToast({ type: 'error', title: editing ? 'Não foi possível atualizar o cartão' : 'Não foi possível criar o cartão', message: cause.message });
    } finally { submitting.current = false; setLoading(false); }
  }
  return <Screen>
    <View style={styles.header}><BrandLogo /><Pressable accessibilityRole="button" accessibilityLabel="Voltar à escolha" hitSlop={12} onPress={onCancel || (() => navigation.goBack())}><Icon name="close" color={colors.secondary} /></Pressable></View>
    <View style={styles.heading}><Text accessibilityRole="header" style={typography.title}>{editing ? 'Editar seu cartão.' : 'Seu cartão de crédito.'}</Text><Text style={typography.body}>{editing ? 'Atualize os dados do seu cartão.' : 'Organize suas faturas e compras parceladas.'}</Text></View>
    <View style={styles.form}>
      <FinancialInstitutionPicker required value={institution} selectedInstitution={selectedInstitution} onChange={(id, bank) => { setInstitution(id); setSelectedInstitution(bank); setErrors(previous => ({ ...previous, institution: undefined })); }} error={errors.institution} />
      <FormField label="Descrição" placeholder="Ex.: Meu cartão Inter" value={description} onChangeText={setDescription} maxLength={100} error={errors.description} testID="card-description" />
      <FormField label="Limite de crédito" value={limit} onChangeText={value => setLimit(maskCurrency(value))} large keyboardType="number-pad" maxLength={25} error={errors.limit} testID="card-limit" />
      <View style={styles.days}>
        <FormField style={styles.day} label="Fechamento" value={closingDay} onChangeText={value => { setClosingDay(value.replace(/\D/g, '').slice(0, 2)); setErrors(previous => ({ ...previous, closingDay: undefined })); }} placeholder="1 a 31" keyboardType="number-pad" maxLength={2} error={errors.closingDay} testID="card-closing-day" />
        <FormField style={styles.day} label="Vencimento" value={dueDay} onChangeText={value => { setDueDay(value.replace(/\D/g, '').slice(0, 2)); setErrors(previous => ({ ...previous, dueDay: undefined })); }} placeholder="1 a 31" keyboardType="number-pad" maxLength={2} error={errors.dueDay} testID="card-due-day" />
      </View>
    </View>
    <View style={styles.bottom}><InlineNotice message={requestError} error /><Text style={styles.hint}>{editing ? 'As faturas existentes mantêm suas datas de fechamento e vencimento.' : 'Você pode editar os dados depois.'}</Text><PrimaryButton title={editing ? 'Salvar alterações' : 'Criar cartão'} onPress={submit} loading={loading} icon={null} /></View>
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { marginTop: 32, gap: 10 }, form: { marginTop: 24, gap: 22, padding: 18, backgroundColor: colors.surface, borderRadius: 24 }, days: { flexDirection: 'row', gap: 14 }, day: { flex: 1 }, bottom: { marginTop: 30, gap: 22 }, hint: { fontFamily, color: colors.secondary, fontSize: 13, lineHeight: 19, textAlign: 'center' } });
