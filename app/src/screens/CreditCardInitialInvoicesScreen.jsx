import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import FormField from '../components/FormField';
import SelectionField from '../components/SelectionField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import { DetailsSkeleton } from '../components/Skeleton';
import useCreditCardDetails from '../hooks/useCreditCardDetails';
import useToast from '../hooks/useToast';
import { distributeCreditCardInitialInvoices } from '../services/creditCards';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils/money';
import { maskPaymentDate } from '../utils/paymentDate';
import { displayInvoiceDate, initialInvoiceDates, initialInvoiceRow, invoiceMonthLabel, invoiceMonths, toCents, validateInitialInvoices } from '../utils/initialInvoices';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium, typography } from '../theme';

export default function CreditCardInitialInvoicesScreen({ uuid, accessToken, onBack, onSaved }) {
  const { card, loading, error, retry } = useCreditCardDetails(uuid, accessToken);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') { return; }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (!saving) { onBack(); } return true; });
    return () => subscription.remove();
  }, [saving, onBack]);
  return <Screen contentStyle={s.content}>
    <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Voltar para o cartão" disabled={saving} onPress={onBack} style={s.back}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" /></View></Pressable><Text style={s.navTitle}>Valores iniciais</Text><View style={s.back} /></View>
    {loading ? <DetailsSkeleton card label="Carregando valores iniciais" /> : error ? <View style={s.feedback}><InlineNotice error message={error} /><PrimaryButton title="Tentar novamente" onPress={retry} outlined icon={null} /></View> : card && <DistributionForm card={card} accessToken={accessToken} saving={saving} setSaving={setSaving} onBack={onBack} onSaved={onSaved} />}
  </Screen>;
}

function DistributionForm({ card, accessToken, saving, setSaving, onBack, onSaved }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState(() => card.invoices.filter(invoice => invoice.status !== 'PAID' && invoice.initialAmount > 0)
    .sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth)).map(invoice => initialInvoiceRow(invoice.uuid, invoice.referenceMonth, card, invoice)));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const counter = useRef(0);
  const busy = useRef(false);
  const reserved = toCents(card.unallocatedUsedLimit) + card.invoices.filter(invoice => invoice.status !== 'PAID')
    .reduce((sum, invoice) => sum + toCents(invoice.initialAmount), 0);
  const pending = rows.reduce((sum, row) => sum + toCents(parseCurrency(row.amount)), 0);
  const paid = card.invoices.filter(invoice => invoice.status === 'PAID').reduce((sum, invoice) => sum + toCents(invoice.initialAmount), 0);
  const remaining = (reserved - pending) / 100;
  const totalInitial = (reserved + paid) / 100;
  const changed = rows.some(row => !row.original || toCents(parseCurrency(row.amount)) !== toCents(row.startingAmount));

  function update(id, values) {
    setRows(previous => previous.map(row => row.id === id ? { ...row, ...values } : row));
    setErrors(previous => ({ ...previous, [id]: undefined, invoices: undefined }));
    setFailure('');
  }
  function changePeriod(row, referenceMonth) {
    const existing = card.invoices.find(invoice => invoice.referenceMonth === referenceMonth);
    const dates = existing || initialInvoiceDates(referenceMonth, card);
    update(row.id, { referenceMonth, closingDate: displayInvoiceDate(dates.closingDate), dueDate: displayInvoiceDate(dates.dueDate) });
  }
  function add() {
    const date = new Date();
    date.setDate(1);
    let reference;
    do {
      reference = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!rows.some(row => row.referenceMonth === reference) && !card.invoices.some(invoice => invoice.referenceMonth === reference && invoice.status === 'PAID')) { break; }
      date.setMonth(date.getMonth() + 1);
    } while (true);
    counter.current += 1;
    setRows(previous => [...previous, initialInvoiceRow(`new-${counter.current}`, reference, card)]);
  }
  function remove(row) {
    if (row.original) { update(row.id, { amount: formatCurrency(0) }); return; }
    setRows(previous => previous.filter(item => item.id !== row.id));
    setErrors(previous => ({ ...previous, [row.id]: undefined, invoices: undefined }));
    setFailure('');
  }
  async function save() {
    if (busy.current || !changed) { return; }
    const result = validateInitialInvoices(rows, card);
    setErrors(result.errors);
    setRows(previous => previous.map(row => result.errors[row.id] ? { ...row, expanded: true } : row));
    if (Object.keys(result.errors).length) { showToast({ type: 'warn', message: 'Confira os campos destacados.' }); return; }
    const changedRows = rows.filter(row => !row.original || toCents(parseCurrency(row.amount)) !== toCents(row.startingAmount));
    const changedInvoices = result.invoices.filter((invoice, index) => changedRows.some(row => row.id === rows[index].id));
    busy.current = true; setSaving(true); setFailure('');
    try {
      await distributeCreditCardInitialInvoices(card.uuid, changedInvoices, accessToken);
      showToast({ type: 'success', message: 'Valores iniciais distribuídos. Seu limite disponível foi preservado.' });
      onSaved();
    } catch (cause) {
      const fields = {};
      changedRows.forEach((row, index) => {
        const rowErrors = {};
        ['referenceMonth', 'initialAmount', 'closingDate', 'dueDate'].forEach(field => {
          const message = cause.fieldErrors?.[`invoices[${index}].${field}`];
          if (message) { rowErrors[field] = message; }
        });
        if (Object.keys(rowErrors).length) { fields[row.id] = rowErrors; }
      });
      setRows(previous => previous.map(row => fields[row.id] ? { ...row, expanded: true } : row));
      setErrors({ ...fields, invoices: cause.fieldErrors?.invoices });
      setFailure(cause.message);
      showToast({ type: 'error', message: 'Não foi possível salvar. Confira os dados e tente novamente.' });
    } finally { busy.current = false; setSaving(false); }
  }
  return <>
    <View style={s.identity}><InstitutionLogo institution={card.financialInstitution} size={42} /><View style={s.identityText}><Text style={s.cardName}>{card.description}</Text><Text style={s.note}>{card.financialInstitution?.name}</Text></View></View>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Organize o que já estava no cartão.</Text><Text style={s.note}>Distribua o valor anterior ao cadastro entre as faturas. Você pode salvar uma parte e continuar depois.</Text></View>
    <View style={s.summary}><Text style={s.note}>Valor inicial comprometido</Text><Text style={s.total}>{formatCurrency(totalInitial)}</Text><View style={s.summaryColumns}><View style={s.metric}><Text style={s.note}>Em faturas{paid > 0 ? ' (inclui pagas)' : ''}</Text><Text style={s.metricValue}>{formatCurrency((pending + paid) / 100)}</Text></View><View style={s.metric}><Text style={s.note}>Falta distribuir</Text><Text accessibilityLiveRegion="polite" style={[s.metricValue, remaining < 0 && s.error]}>{formatCurrency(remaining)}</Text></View></View><View style={s.limitNote}><Icon name="info" size={17} color={colors.primary} /><Text style={s.limitText}>Seu limite disponível continua em {formatCurrency(card.availableLimit)}.</Text></View></View>
    <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>Distribuição por fatura</Text><Text style={s.note}>{rows.length} / 120</Text></View>
    {rows.length === 0 && <View style={s.empty}><Icon name="statement" size={30} color={colors.primary} /><Text style={s.emptyTitle}>Comece pela fatura que você já conhece</Text><Text style={s.note}>O restante continuará reservado, mesmo sem uma fatura definida.</Text></View>}
    {rows.map(row => {
      const existing = card.invoices.find(invoice => invoice.referenceMonth === row.referenceMonth);
      const fields = errors[row.id] || {};
      const [year, month] = row.referenceMonth.split('-');
      const currentYear = new Date().getFullYear();
      const years = [...new Set([...Array.from({ length: 21 }, (_, index) => currentYear - 10 + index), Number(year)])].sort((a, b) => a - b);
      return <View key={row.id} style={s.invoice}>
        <View style={s.rowHeader}><View style={s.rowIdentity}><Text style={s.rowTitle}>{invoiceMonthLabel(row.referenceMonth)}</Text><Text style={s.note}>{existing ? 'Fatura existente' : 'Nova fatura'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${row.original ? 'Zerar valor inicial de' : 'Remover fatura de'} ${invoiceMonthLabel(row.referenceMonth)}`} disabled={saving} onPress={() => remove(row)} style={s.back}><Icon name="close" color={colors.secondary} size={20} /></Pressable></View>
        <FormField label={`Valor inicial de ${invoiceMonthLabel(row.referenceMonth)}`} value={row.amount} onChangeText={value => update(row.id, { amount: maskCurrency(value) })} editable={!saving} keyboardType="number-pad" maxLength={25} error={fields.initialAmount} testID={`initial-amount-${row.id}`} hint={row.original && parseCurrency(row.amount) === 0 ? 'Ao salvar, só o valor inicial será zerado. As compras permanecem.' : undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Datas e período de ${invoiceMonthLabel(row.referenceMonth)}`} accessibilityState={{ expanded: row.expanded }} disabled={saving} onPress={() => update(row.id, { expanded: !row.expanded })} style={s.expand}><Text style={s.link}>Datas e período</Text><Icon name="chevronDown" size={18} color={colors.primary} /></Pressable>
        {!!fields.referenceMonth && <Text accessibilityRole="alert" style={s.error}>{fields.referenceMonth}</Text>}
        {row.expanded && <View style={s.rowFields}>
          {!row.original && <View style={s.columns}><View style={s.monthField}><SelectionField label="Mês da fatura" value={Number(month)} options={invoiceMonths.map((label, index) => ({ label, value: index + 1 }))} onChange={value => changePeriod(row, `${year}-${String(value).padStart(2, '0')}`)} disabled={saving} /></View><View style={s.yearField}><SelectionField label="Ano da fatura" value={Number(year)} options={years.map(value => ({ label: String(value), value }))} onChange={value => changePeriod(row, `${value}-${month}`)} disabled={saving} /></View></View>}
          <View style={s.columns}><FormField style={s.metric} label="Fechamento" value={row.closingDate} onChangeText={value => update(row.id, { closingDate: maskPaymentDate(value) })} editable={!saving && !existing} keyboardType="number-pad" maxLength={10} error={fields.closingDate} /><FormField style={s.metric} label="Vencimento" value={row.dueDate} onChangeText={value => update(row.id, { dueDate: maskPaymentDate(value) })} editable={!saving && !existing} keyboardType="number-pad" maxLength={10} error={fields.dueDate} /></View>
          <Text style={s.note}>{existing ? 'As datas e compras da fatura existente serão mantidas.' : 'Confira as datas no app do banco antes de salvar.'}</Text>
        </View>}
      </View>;
    })}
    <PrimaryButton title="Adicionar fatura" outlined icon="plus" disabled={saving || rows.length >= 120 || totalInitial === 0} onPress={add} />
    <InlineNotice error message={errors.invoices || failure} />
    <View style={s.footer}><Text style={s.note}>Esses valores não criam compras no extrato. O saldo da conta só muda ao pagar uma fatura.</Text><PrimaryButton title="Salvar distribuição" onPress={save} loading={saving} disabled={!changed || rows.length === 0} icon={null} /><Pressable accessibilityRole="button" accessibilityLabel="Continuar depois" disabled={saving} onPress={onBack} style={s.later}><Text style={s.link}>Continuar depois</Text></Pressable></View>
  </>;
}

const s = StyleSheet.create({
  content: { justifyContent: 'flex-start', paddingTop: 8, gap: 18 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, navTitle: { fontFamily: fontFamilyMedium, fontSize: 18, color: colors.text },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, identityText: { flex: 1, gap: 3 }, cardName: { fontFamily: fontFamilyBold, color: colors.text, fontSize: 16 }, heading: { gap: 10 }, title: { ...typography.title, fontSize: 27, lineHeight: 35 },
  note: { fontFamily, color: colors.secondary, fontSize: 13, lineHeight: 20 }, summary: { padding: 20, borderRadius: 24, backgroundColor: colors.surface, gap: 6 }, total: { fontFamily: fontFamilyBold, color: colors.text, fontSize: 32, fontVariant: ['tabular-nums'] }, summaryColumns: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, metric: { flex: 1, minWidth: 0, gap: 5 }, metricValue: { fontFamily: fontFamilyBold, color: colors.text, fontSize: 19, fontVariant: ['tabular-nums'] }, limitNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 10 }, limitText: { flex: 1, fontFamily, fontSize: 12, lineHeight: 19, color: colors.primary },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { fontFamily: fontFamilyBold, color: colors.text, fontSize: 18 }, empty: { paddingVertical: 18, gap: 10 }, emptyTitle: { fontFamily: fontFamilyMedium, color: colors.text, fontSize: 16, lineHeight: 23 },
  invoice: { padding: 18, backgroundColor: colors.surface, borderRadius: 20, gap: 14 }, rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, rowIdentity: { flex: 1, gap: 4 }, rowTitle: { fontFamily: fontFamilyBold, color: colors.text, fontSize: 17 }, expand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }, link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 14 }, rowFields: { gap: 14 }, columns: { flexDirection: 'row', gap: 12 }, monthField: { flex: 3 }, yearField: { flex: 2 },
  error: { fontFamily, color: colors.error, fontSize: 13, lineHeight: 20 }, footer: { gap: 18, marginTop: 6 }, later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, feedback: { gap: 16, marginTop: 20 },
});
