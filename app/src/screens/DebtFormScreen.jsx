import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import GlassBackButton from '../components/GlassBackButton';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import { useThemeStyles } from '../contexts/ThemeContext';
import useToast from '../hooks/useToast';
import { createDebt, updateDebt } from '../services/debts';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils/money';
import { displayInvoiceDate, parseInvoiceDate, toCents } from '../utils/initialInvoices';
import { maskPaymentDate } from '../utils/paymentDate';
import { randomUUID } from '../utils/randomUuid';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function DebtFormScreen({ debt, accessToken, onBack, onSaved, onSavingChange }) {
  const s = useThemeStyles(createStyles);
  const { showToast } = useToast();
  const [values, setValues] = useState({
    creditor: debt?.creditor ?? '',
    description: debt?.description ?? '',
    totalAmount: formatCurrency(debt?.totalAmount ?? 0),
    installmentCount: String(debt?.installmentCount ?? 1),
    paidInstallments: String(debt?.paidInstallments ?? 0),
    nextDueDate: debt?.installments[0] ? displayInvoiceDate(debt.installments[0].dueDate) : '',
  });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const requestUuid = useRef(null);
  const installmentCount = Number(values.installmentCount);
  const paidInstallments = Number(values.paidInstallments);
  const settled = !!debt && installmentCount > 0 && paidInstallments === installmentCount;
  const lockedPlan = debt?.hasRecordedPayments === true;

  function field(name, mask, readOnly = false) {
    return {
      value: values[name], error: errors[name], editable: !saving && !readOnly,
      onChangeText: value => {
        setValues(previous => ({ ...previous, [name]: mask ? mask(value) : value }));
        setErrors(previous => ({ ...previous, [name]: undefined }));
        setRequestError('');
      },
    };
  }

  async function submit() {
    if (submitting.current) { return; }
    const next = {};
    const creditor = values.creditor.trim();
    const totalAmount = parseCurrency(values.totalAmount);
    let nextDueDate = null;
    if (!creditor) { next.creditor = 'Informe para quem você deve.'; }
    if (totalAmount <= 0 || totalAmount > 9999999999.99) { next.totalAmount = 'Informe um valor válido maior que zero.'; }
    if (installmentCount < 1 || installmentCount > 120) { next.installmentCount = 'Informe de 1 a 120 parcelas.'; }
    if (!next.installmentCount && (paidInstallments > installmentCount || (!debt && paidInstallments === installmentCount))) {
      next.paidInstallments = debt ? 'O número deve ser de até o total de parcelas.' : 'O número deve ser menor que o total de parcelas.';
    }
    if (!next.totalAmount && !next.installmentCount && toCents(totalAmount) < installmentCount) {
      next.totalAmount = 'Cada parcela deve ter pelo menos R$ 0,01.';
    }
    if (!settled) {
      try { nextDueDate = parseInvoiceDate(values.nextDueDate); }
      catch (cause) { next.nextDueDate = cause.message; }
    }
    setErrors(next);
    if (Object.keys(next).length) { return; }
    submitting.current = true;
    setSaving(true);
    onSavingChange(true);
    setRequestError('');
    try {
      requestUuid.current ??= debt?.uuid ?? randomUUID();
      const request = { uuid: requestUuid.current, creditor, description: values.description.trim() || null,
        totalAmount, installmentCount, paidInstallments, nextDueDate };
      if (debt) {
        await updateDebt(debt.uuid, { ...request, version: debt.version }, accessToken);
      } else {
        await createDebt(request, accessToken);
      }
      showToast({ type: 'success', message: debt ? 'Dívida atualizada.' : 'Dívida cadastrada.' });
      onSaved();
    } catch (cause) {
      setErrors(cause.fieldErrors || {});
      setRequestError(cause.message);
    } finally {
      submitting.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  }

  const digits = value => value.replace(/\D/g, '');
  return <Screen contentStyle={s.content}>
    <View style={s.nav}>
      <GlassBackButton accessibilityLabel="Voltar para contas e cartões" disabled={saving} onPress={onBack} />
      <Text accessibilityRole="header" style={s.title}>{debt ? 'Editar dívida' : 'Nova dívida'}</Text>
      <View style={s.back} />
    </View>
    {debt && <Text style={s.subtitle}>{lockedPlan
      ? 'Para alterar o parcelamento, estorne os pagamentos registrados no extrato.'
      : 'Alterar o valor total ou o número de parcelas recalcula os valores do plano, inclusive o total já pago.'}</Text>}
    <View style={s.form}>
      <FormField label="Valor total da dívida" large keyboardType="number-pad" maxLength={22}
        testID="debt-amount" {...field('totalAmount', maskCurrency, lockedPlan)} />
      <FormField label="Para quem você deve" placeholder="Nome da pessoa ou empresa" maxLength={100}
        autoCapitalize="words" testID="debt-creditor" {...field('creditor')} />
      <FormField label="Descrição (opcional)" placeholder="Ex.: Empréstimo pessoal" maxLength={500}
        multiline textAlignVertical="top" testID="debt-description" {...field('description')} />
      <FormField label="Total de parcelas" keyboardType="number-pad" maxLength={3}
        testID="debt-installment-count" {...field('installmentCount', digits, lockedPlan)} />
      <FormField label="Parcelas já pagas" keyboardType="number-pad" maxLength={3}
        hint={lockedPlan ? undefined : 'Se a próxima é a 3ª parcela, informe 2.'}
        testID="debt-paid-installments" {...field('paidInstallments', digits, lockedPlan)} />
      {!settled && <FormField label="Vencimento da próxima parcela" placeholder="DD/MM/AAAA" keyboardType="number-pad" maxLength={10}
        testID="debt-next-due-date" {...field('nextDueDate', maskPaymentDate, lockedPlan)} />}
    </View>
    <View style={s.footer}>
      <InlineNotice message={requestError} error />
      <PrimaryButton title={debt ? 'Salvar alterações' : 'Salvar dívida'} onPress={submit} loading={saving} icon={null} />
      {debt && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edição" disabled={saving}
        onPress={onBack} style={s.cancel}><Text style={s.cancelText}>Cancelar</Text></Pressable>}
    </View>
  </Screen>;
}

const createStyles = colors => StyleSheet.create({
  content: { paddingTop: 8, paddingHorizontal: 22, justifyContent: 'flex-start' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44 },
  title: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 18 },
  subtitle: { color: colors.secondary, fontFamily, fontSize: 14, lineHeight: 22, marginTop: 20 },
  form: { marginTop: 22, padding: 18, gap: 20, borderRadius: 24, backgroundColor: colors.surface },
  footer: { marginTop: 24, gap: 12 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.primary, fontFamily: fontFamilyMedium, fontSize: 15 },
});
