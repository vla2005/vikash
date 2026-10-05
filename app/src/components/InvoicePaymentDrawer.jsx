import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Modal, TextInput, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import useAccounts from '../hooks/useAccounts';
import useToast from '../hooks/useToast';
import { payCreditCardInvoice } from '../services/creditCards';
import InstitutionLogo from './InstitutionLogo';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';
import { initialPaymentDate, maskPaymentDate, maskPaymentTime, parsePaymentDate } from '../utils/paymentDate';

const methods = [['PIX', 'Pix'], ['BANK_SLIP', 'Boleto'], ['DEBIT_CARD', 'Débito'], ['CASH', 'Dinheiro']];

export default function InvoicePaymentDrawer({ invoice, accessToken, onClose, onPaid }) {
  const { accounts, loading, error, retry } = useAccounts(accessToken, true);
  const { showToast } = useToast();
  const [accountUuid, setAccountUuid] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [date, setDate] = useState(() => initialPaymentDate().date);
  const [time, setTime] = useState(() => initialPaymentDate().time);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  const selected = accounts.find(account => account.uuid === accountUuid);
  async function confirm() {
    if (busy.current || !selected) { return; }
    busy.current = true; setSaving(true); setFailure('');
    try {
      await payCreditCardInvoice(invoice.uuid, { accountUuid, paymentMethod, occurredAt: parsePaymentDate(date, time) }, accessToken);
      showToast({ type: 'success', message: 'Fatura paga. Saldo e limite atualizados.' });
      onPaid();
    } catch (cause) {
      setFailure(cause.message);
      showToast({ type: 'error', message: cause.message });
    } finally { busy.current = false; setSaving(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy.current) { onClose(); } }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Fechar pagamento" style={StyleSheet.absoluteFill} disabled={saving} onPress={onClose} />
      <View style={s.drawer}><View style={s.handle} /><Text style={s.title}>Marcar fatura como paga</Text><Text style={s.amount}>{formatCurrency(invoice.total)}</Text>
        <Text style={s.note}>Escolha a conta de onde saiu o dinheiro. O pagamento será registrado no extrato e liberará este valor do limite.</Text>
        <ScrollView keyboardShouldPersistTaps="handled"><Text style={s.label}>Conta do pagamento</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : error ? <><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable onPress={retry}><Text style={s.link}>Tentar novamente</Text></Pressable></> : accounts.length === 0 ? <Text style={s.note}>Cadastre uma conta antes de pagar a fatura.</Text> : accounts.map(account => <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Pagar com ${account.description}`} accessibilityState={{ selected: accountUuid === account.uuid }} disabled={saving} onPress={() => setAccountUuid(account.uuid)} style={[s.account, accountUuid === account.uuid && s.selected]}><InstitutionLogo institution={account.financialInstitution} fallbackIcon={account.type === 'CARTEIRA' ? 'wallet' : 'bank'} size={36} /><View style={s.info}><Text style={s.name}>{account.description}</Text><Text style={s.note}>Saldo: {formatCurrency(account.balance)}</Text></View><Text style={s.link}>{accountUuid === account.uuid ? '✓' : ''}</Text></Pressable>)}
          <Text style={s.label}>Forma de pagamento</Text><View style={s.methods}>{methods.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: paymentMethod === value }} disabled={saving} onPress={() => setPaymentMethod(value)} style={[s.method, value === paymentMethod && s.selected]}><Text style={s.name}>{label}</Text></Pressable>)}</View>
          <Text style={s.label}>Quando você pagou?</Text>
          <View style={s.dateFields}><View style={s.dateField}><Text style={s.note}>Data</Text><TextInput accessibilityLabel="Data do pagamento" placeholder="DD/MM/AAAA" value={date} onChangeText={value => setDate(maskPaymentDate(value))} editable={!saving} keyboardType="number-pad" maxLength={10} style={s.input} /></View><View style={s.timeField}><Text style={s.note}>Horário</Text><TextInput accessibilityLabel="Horário do pagamento" placeholder="HH:MM" value={time} onChangeText={value => setTime(maskPaymentTime(value))} editable={!saving} keyboardType="number-pad" maxLength={5} style={s.input} /></View></View>
          {!!failure && <Text accessibilityRole="alert" style={s.error}>{failure}</Text>}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Confirmar pagamento da fatura" disabled={saving || loading || !!error || !selected} onPress={confirm} style={[s.confirm, (saving || loading || !!error || !selected) && s.disabled]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.confirmText}>Confirmar pagamento</Text>}</Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={s.cancel}><Text style={s.note}>Cancelar</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  dateFields: { flexDirection: 'row', gap: 12 }, dateField: { flex: 2 }, timeField: { flex: 1 }, input: { fontFamily, fontSize: 16, backgroundColor: '#FFF', color: colors.text, borderRadius: 12, borderWidth: 1, borderColor: '#DFE0E4', padding: 14, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end' },
  drawer: { maxHeight: '85%', backgroundColor: colors.background, padding: 22, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#CFD0D3', alignSelf: 'center', marginBottom: 20 },
  title: { fontFamily: fontFamilyBold, fontSize: 25, fontWeight: '700', color: colors.text }, amount: { fontFamily: fontFamilyBold, fontSize: 34, fontWeight: '700', color: colors.text, marginVertical: 10 },
  note: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary }, label: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 22, marginBottom: 12 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DFE0E4', marginBottom: 8 },
  info: { flex: 1 }, name: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.text, fontWeight: '600' }, selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, method: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DFE0E4', backgroundColor: '#FFF' },
  link: { fontFamily: fontFamilyMedium, color: colors.primary, fontWeight: '600' }, error: { fontFamily, color: colors.negative, marginVertical: 12 },
  confirm: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, disabled: { opacity: 0.45 },
  confirmText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: '#FFF' }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
