import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import FormField from '../components/FormField';
import SelectionField from '../components/SelectionField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import CategoryIcon from '../components/CategoryIcon';
import Skeleton, { SkeletonGroup } from '../components/Skeleton';
import useAccounts from '../hooks/useAccounts';
import useCreditCards from '../hooks/useCreditCards';
import useCategories from '../hooks/useCategories';
import useToast from '../hooks/useToast';
import { updateTransaction } from '../services/transactions';
import { categoryColors } from '../data/categories';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

const methods = [
  { value: 'PIX', label: 'Pix' }, { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' }, { value: 'BANK_SLIP', label: 'Boleto' },
  { value: 'BANK_TRANSFER', label: 'Transferência bancária' }, { value: 'CASH', label: 'Dinheiro' }, { value: 'OTHER', label: 'Outro' },
];
const categoryKey = category => !category ? 'none' : category.uuid ? `custom:${category.uuid}` : `default:${category.name}`;
function resourceOptions(items, current) {
  const all = current && !items.some(item => item.uuid === current.uuid) ? [current, ...items] : items;
  return all.map(item => ({ value: item.uuid, label: item.description, institution: item.financialInstitution }));
}

export default function EditTransactionScreen({ details, purchase = false, accessToken, onBack, onSaved, onSavingChange }) {
  const accountList = useAccounts(accessToken, true);
  const cardList = useCreditCards(accessToken, true);
  const categoryList = useCategories(accessToken, true);
  const { showToast } = useToast();
  const [description, setDescription] = useState(details.description);
  const [amount, setAmount] = useState(formatCurrency(details.amount));
  const [paymentMethod, setPaymentMethod] = useState(purchase ? 'CREDIT_CARD' : details.paymentMethod);
  const [accountUuid, setAccountUuid] = useState(details.account?.uuid);
  const [cardUuid, setCardUuid] = useState(details.creditCard?.uuid);
  const [destinationUuid, setDestinationUuid] = useState(details.destinationAccount?.uuid);
  const [category, setCategory] = useState(categoryKey(details.category));
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const isCredit = paymentMethod === 'CREDIT_CARD';
  const isPayment = !purchase && details.type === 'INVOICE_PAYMENT';
  const isTransfer = !purchase && details.type === 'TRANSFER';
  const paidPurchase = purchase && details.installments.some(item => item.status === 'PAID');
  const loading = accountList.loading || cardList.loading || categoryList.loading;
  const loadError = accountList.error || cardList.error || categoryList.error;
  const accounts = resourceOptions(accountList.accounts, details.account);
  const destinations = resourceOptions(accountList.accounts, details.destinationAccount);
  const cards = resourceOptions(cardList.cards, details.creditCard);
  const categories = [...categoryList.defaultCategories, ...categoryList.categories];
  if (details.category && !categories.some(item => categoryKey(item) === categoryKey(details.category))) { categories.unshift(details.category); }
  const categoryOptions = [{ value: 'none', label: 'Sem categoria' }, ...categories.map(item => ({ ...item, value: categoryKey(item), label: item.name }))];
  function clear(field) { setErrors(previous => ({ ...previous, [field]: undefined })); setRequestError(''); }
  function retry() { accountList.retry(); cardList.retry(); categoryList.retry(); }

  async function submit() {
    if (submitting.current || loading || loadError) { return; }
    const value = parseCurrency(amount);
    const next = {};
    if (!description.trim()) { next.description = 'Informe a descrição.'; }
    if (!Number.isFinite(value) || value <= 0 || value > 9999999999999.99) { next.amount = 'Informe um valor válido maior que zero.'; }
    if (isCredit && !cardUuid) { next.creditCardUuid = 'Selecione o cartão.'; }
    if (!isCredit && !accountUuid) { next.accountUuid = 'Selecione a conta.'; }
    if (isTransfer && (!destinationUuid || destinationUuid === accountUuid)) { next.destinationAccountUuid = 'Escolha um destino diferente da origem.'; }
    if (isCredit && value < (details.installmentCount || 1) * 0.01) { next.amount = 'Cada parcela deve ter pelo menos R$ 0,01.'; }
    setErrors(next);
    if (Object.keys(next).length) { showToast({ type: 'warn', message: 'Confira os campos destacados.' }); return; }
    const selectedCategory = categoryOptions.find(item => item.value === category);
    submitting.current = true; setSaving(true); onSavingChange?.(true); setRequestError('');
    try {
      await updateTransaction(details.uuid, {
        description: description.trim(), amount: value, paymentMethod,
        accountUuid: isCredit ? null : accountUuid, creditCardUuid: isCredit ? cardUuid : null,
        destinationAccountUuid: isTransfer ? destinationUuid : null,
        defaultCategoryName: !isPayment && category.startsWith('default:') ? selectedCategory.name : null,
        customCategoryUuid: !isPayment && category.startsWith('custom:') ? selectedCategory.uuid : null,
      }, accessToken, purchase);
      showToast({ type: 'success', title: 'Lançamento atualizado', message: 'Os saldos e limites foram atualizados.' });
      onSaved();
    } catch (failure) {
      setErrors(failure.fieldErrors || {}); setRequestError(failure.message);
      showToast({ type: 'error', message: 'Não foi possível salvar. Confira os dados e tente novamente.' });
    } finally { submitting.current = false; setSaving(false); onSavingChange?.(false); }
  }

  const resourceIcon = option => <InstitutionLogo institution={option.institution} size={28} />;
  const categoryIcon = option => {
    const palette = categoryColors.find(item => item.key === option.color);
    return <CategoryIcon name={option.icon || 'ellipsis'} color={palette?.foreground || colors.secondary} size={24} />;
  };
  return <Screen contentStyle={s.content}>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Voltar aos detalhes" disabled={saving} onPress={onBack} style={s.back}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" size={24} /></View></Pressable><Text accessibilityRole="header" style={s.navTitle}>{purchase ? 'Editar compra' : 'Editar transação'}</Text><View style={s.back} /></View>
    <Text style={s.subtitle}>Ajuste seu lançamento. Os valores serão recalculados ao salvar.</Text>
    <View style={s.form}>
      <FormField label="Valor" value={amount} onChangeText={text => { setAmount(maskCurrency(text)); clear('amount'); }} large keyboardType="number-pad" maxLength={25} editable={!saving && !paidPurchase && !isPayment} error={errors.amount} testID="edit-entry-amount" />
      <FormField label="Descrição" value={description} onChangeText={text => { setDescription(text); clear('description'); }} maxLength={255} editable={!saving} error={errors.description} testID="edit-entry-description" />
      {loading ? <SkeletonGroup label="Carregando opções do lançamento" style={s.options}>{[0, 1, 2].map(item => <Skeleton key={item} height={76} radius={14} />)}</SkeletonGroup> : loadError ? <View style={s.options}><InlineNotice message={loadError} error /><PrimaryButton title="Tentar novamente" outlined onPress={retry} icon={null} /></View> : <>
        {!isPayment && <SelectionField label="Categoria" value={category} options={categoryOptions} searchable renderLeading={categoryIcon} disabled={saving} onChange={value => { setCategory(value); clear('customCategoryUuid'); clear('defaultCategoryName'); }} error={errors.customCategoryUuid || errors.defaultCategoryName} />}
        <SelectionField label="Forma de pagamento" value={paymentMethod} options={methods.filter(item => item.value !== 'CREDIT_CARD' || purchase || details.type === 'EXPENSE')} disabled={saving || paidPurchase} onChange={value => { setPaymentMethod(value); clear('paymentMethod'); clear('accountUuid'); clear('creditCardUuid'); }} error={errors.paymentMethod} />
        {isCredit ? <SelectionField label="Cartão de crédito" value={cardUuid} options={cards} renderLeading={resourceIcon} searchable disabled={saving || paidPurchase} onChange={value => { setCardUuid(value); clear('creditCardUuid'); }} error={errors.creditCardUuid} />
          : <SelectionField label={isTransfer ? 'Conta de origem' : 'Conta'} value={accountUuid} options={accounts} renderLeading={resourceIcon} searchable disabled={saving} onChange={value => { setAccountUuid(value); clear('accountUuid'); }} error={errors.accountUuid} />}
        {isTransfer && <SelectionField label="Conta de destino" value={destinationUuid} options={destinations.filter(item => item.value !== accountUuid)} renderLeading={resourceIcon} searchable disabled={saving} onChange={value => { setDestinationUuid(value); clear('destinationAccountUuid'); }} error={errors.destinationAccountUuid} />}
      </>}
    </View>
    <View style={s.notice}><Icon name="info" size={22} color={colors.primary} /><Text style={s.noticeText}>{paidPurchase ? 'Há parcelas pagas. Você pode editar a descrição e a categoria. Para mudar valores ou cartão, desfaça o pagamento da fatura primeiro.' : isPayment ? 'O valor e a fatura são mantidos. Você pode corrigir a descrição, a forma de pagamento e a conta utilizada.' : purchase && !isCredit ? 'Todas as parcelas serão retiradas do cartão. O valor total será lançado como uma saída na conta escolhida.' : isCredit ? `Esta compra terá ${purchase ? details.installmentCount : 1} parcela${purchase && details.installmentCount > 1 ? 's' : ''}. O saldo da conta muda somente no pagamento da fatura.` : 'O efeito do lançamento anterior será desfeito antes de aplicar os novos dados.'}</Text></View>
    <View style={s.footer}><InlineNotice message={requestError} error /><PrimaryButton title="Salvar alterações" onPress={submit} loading={saving} disabled={loading || !!loadError} icon={null} /><Pressable accessibilityRole="button" accessibilityLabel="Cancelar edição" disabled={saving} onPress={onBack} style={s.cancel}><Text style={s.cancelText}>Cancelar</Text></Pressable></View>
  </Screen>;
}
const s = StyleSheet.create({
  content: { paddingTop: 8, paddingHorizontal: 22, justifyContent: 'flex-start' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fontFamilyBold, fontSize: 18, color: colors.text },
  subtitle: { fontFamily, fontSize: 14, lineHeight: 22, color: colors.secondary, marginTop: 20, marginBottom: 22 },
  form: { backgroundColor: colors.surface, padding: 18, borderRadius: 24, gap: 20 },
  options: { gap: 20 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 18, backgroundColor: colors.primarySoft, gap: 10, marginTop: 20 },
  noticeText: { flex: 1, fontFamily, fontSize: 12, lineHeight: 19, color: colors.secondary },
  footer: { marginTop: 24, gap: 12 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fontFamilyMedium, fontSize: 15, color: colors.primary },
});
