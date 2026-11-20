import { useInputTheme, useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListSkeleton } from './Skeleton';
import useAccounts from '../hooks/useAccounts';
import useToast from '../hooks/useToast';
import { payCreditCardInvoice, registerExternalInvoicePayment } from '../services/creditCards';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import DrawerPanel from './DrawerPanel';
import DrawerModal from './DrawerModal';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';
import { initialPaymentDate, maskPaymentDate, maskPaymentTime, parsePaymentDate } from '../utils/paymentDate';

const methods = [['PIX', 'Pix'], ['BANK_SLIP', 'Boleto'], ['DEBIT_CARD', 'Débito'], ['CASH', 'Dinheiro']];

export default function InvoicePaymentDrawer({ visible = true, invoice, accessToken, onClose, onPaid }) {
  const inputTheme = useInputTheme();
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [paidBySomeoneElse, setPaidBySomeoneElse] = useState(false);
  const { accounts, loading, error, retry } = useAccounts(accessToken, visible && !paidBySomeoneElse);
  const { showToast } = useToast();
  const [accountUuid, setAccountUuid] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [date, setDate] = useState(() => initialPaymentDate().date);
  const [time, setTime] = useState(() => initialPaymentDate().time);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    if (visible) {
      const initial = initialPaymentDate();
      setAccountUuid(null); setPaymentMethod('PIX'); setPaidBySomeoneElse(false);
      setDate(initial.date); setTime(initial.time); setFailure('');
    }
  }, [visible, invoice.uuid]);
  const selected = accounts.find(account => account.uuid === accountUuid);
  const canConfirm = !saving && (paidBySomeoneElse || (!loading && !error && !!selected));
  function toggleExternalPayment() {
    if (busy.current) { return; }
    setPaidBySomeoneElse(value => !value);
    setFailure('');
  }
  async function confirm() {
    if (busy.current || !canConfirm) { return; }
    busy.current = true; setSaving(true); setFailure('');
    try {
      const occurredAt = parsePaymentDate(date, time);
      if (paidBySomeoneElse) {
        await registerExternalInvoicePayment(invoice.uuid, occurredAt, accessToken);
      } else {
        await payCreditCardInvoice(invoice.uuid, { accountUuid, paymentMethod, occurredAt }, accessToken);
      }
      showToast({ type: 'success', message: paidBySomeoneElse
        ? 'Fatura paga. Limite liberado sem alterar seus saldos.' : 'Fatura paga. Saldo e limite atualizados.' });
      onPaid(paidBySomeoneElse);
    } catch (cause) {
      setFailure(cause.message);
      showToast({ type: 'error', message: cause.message });
    } finally { busy.current = false; setSaving(false); }
  }
  return <DrawerModal visible={visible} onRequestClose={() => { if (!busy.current) { onClose(); } }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Fechar pagamento" style={StyleSheet.absoluteFill} disabled={saving} onPress={onClose} />
      <DrawerPanel style={s.drawer}><View style={s.handle} /><Text style={s.title}>Marcar fatura como paga</Text><Text style={s.amount}>{formatCurrency(invoice.total)}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="checkbox" accessibilityLabel="Paga por outra pessoa"
            accessibilityHint="Registra a quitação sem alterar o saldo das suas contas"
            aria-checked={paidBySomeoneElse}
            accessibilityState={{ checked: paidBySomeoneElse, disabled: saving }} disabled={saving}
            onPress={toggleExternalPayment}
            onKeyDown={Platform.OS === 'web' ? event => {
              if (event.key === ' ') {
                event.preventDefault();
                if (!event.repeat) { toggleExternalPayment(); }
              }
            } : undefined}
            style={({ pressed, focused }) => [s.account, paidBySomeoneElse && s.selected, focused && s.focused, pressed && s.pressed]}>
            <View style={[s.checkbox, paidBySomeoneElse && s.checkboxChecked]}>
              {paidBySomeoneElse && <Icon name="check" size={16} color={colors.onBrand} />}
            </View>
            <Text style={[s.name, s.info]}>Paga por outra pessoa</Text>
          </Pressable>
          <Text style={s.note}>{paidBySomeoneElse
            ? 'A fatura será marcada como paga e o limite será liberado. O saldo das suas contas fica igual.'
            : 'Escolha a conta de onde saiu o dinheiro. O pagamento será registrado no extrato e liberará este valor do limite.'}</Text>
          {!paidBySomeoneElse && <><Text style={s.label}>Conta do pagamento</Text>
          {loading ? <ListSkeleton label="Carregando contas para pagamento" count={3} showAmount={false} /> : error ? <><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable onPress={retry}><Text style={s.link}>Tentar novamente</Text></Pressable></> : accounts.length === 0 ? <Text style={s.note}>Cadastre uma conta antes de pagar a fatura.</Text> : accounts.map(account => <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Pagar com ${account.description}`} accessibilityState={{ selected: accountUuid === account.uuid }} disabled={saving} onPress={() => setAccountUuid(account.uuid)} style={[s.account, accountUuid === account.uuid && s.selected]}><InstitutionLogo institution={account.financialInstitution} fallbackIcon={account.type === 'CARTEIRA' ? 'wallet' : 'bank'} size={36} /><View style={s.info}><Text style={s.name}>{account.description}</Text><Text style={s.note}>Saldo: {formatCurrency(account.balance)}</Text></View><Text style={s.link}>{accountUuid === account.uuid ? '✓' : ''}</Text></Pressable>)}
          <Text style={s.label}>Forma de pagamento</Text><View style={s.methods}>{methods.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: paymentMethod === value }} disabled={saving} onPress={() => setPaymentMethod(value)} style={[s.method, value === paymentMethod && s.selected]}><Text style={s.name}>{label}</Text></Pressable>)}</View></>}
          <Text style={s.label}>Quando a fatura foi paga?</Text>
          <View style={s.dateFields}><View style={s.dateField}><Text style={s.note}>Data</Text><TextInput {...inputTheme} accessibilityLabel="Data do pagamento" placeholder="DD/MM/AAAA" value={date} onChangeText={value => setDate(maskPaymentDate(value))} editable={!saving} keyboardType="number-pad" maxLength={10} style={s.input} /></View><View style={s.timeField}><Text style={s.note}>Horário</Text><TextInput {...inputTheme} accessibilityLabel="Horário do pagamento" placeholder="HH:MM" value={time} onChangeText={value => setTime(maskPaymentTime(value))} editable={!saving} keyboardType="number-pad" maxLength={5} style={s.input} /></View></View>
          {!!failure && <Text accessibilityRole="alert" style={s.error}>{failure}</Text>}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Confirmar pagamento da fatura" accessibilityState={{ busy: saving, disabled: !canConfirm }} disabled={!canConfirm} onPress={confirm} style={[s.confirm, !canConfirm && s.disabled]}><Text style={s.confirmText}>{saving ? 'Confirmando pagamento…' : 'Confirmar pagamento'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={s.cancel}><Text style={s.note}>Cancelar</Text></Pressable>
      </DrawerPanel>
    </KeyboardAvoidingView>
  </DrawerModal>;
}
const createStyles = (colors) => StyleSheet.create({
  dateFields: { flexDirection: 'row', gap: 12 }, dateField: { flex: 2 }, timeField: { flex: 1 }, input: { fontFamily, fontSize: 16, backgroundColor: colors.surface, color: colors.text, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: colors.dialogBackdrop, justifyContent: 'flex-end' },
  drawer: { maxHeight: '85%', padding: 22, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.handle, alignSelf: 'center', marginBottom: 20 },
  title: { fontFamily: fontFamilyBold, fontSize: 25, fontWeight: '700', color: colors.text }, amount: { fontFamily: fontFamilyBold, fontSize: 34, fontWeight: '700', color: colors.text, marginVertical: 10 },
  note: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary }, label: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 22, marginBottom: 12 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  focused: { borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  info: { flex: 1 }, name: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.text, fontWeight: '600' }, selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, method: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  link: { fontFamily: fontFamilyMedium, color: colors.primary, fontWeight: '600' }, error: { fontFamily, color: colors.negative, marginVertical: 12 },
  confirm: { backgroundColor: colors.brandPrimary, borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, disabled: { opacity: 0.45 },
  confirmText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.onBrand }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
