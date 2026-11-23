import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassPanel from './silver/GlassPanel';
import { AnimatedPressable } from './motion/AnimatedPrimitives';
import DebtMonthlyChart from './DebtMonthlyChart';
import ConfirmationDialog from './ConfirmationDialog';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';
import InlineNotice from './InlineNotice';
import PrimaryButton from './PrimaryButton';
import { ListSkeleton } from './Skeleton';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import useToast from '../hooks/useToast';
import { formatCurrency } from '../utils/money';
import { displayInvoiceDate, invoiceMonthLabel } from '../utils/initialInvoices';
import { debtToday, formatDebtCents as formatCents, summarizeDebts } from '../utils/debts';
import { fontFamily, fontFamilyBold } from '../theme';

const visibleMonths = 6;
const visibleInstallments = 4;

export default function DebtsSection({ list, accounts, accountsLoading, accountsError, onRetryAccounts, onCreate, expandedDebt, onToggleDebt, onEdit }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const { showToast } = useToast();
  const { debts, loading, error, retry, pay } = list;
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [payment, setPayment] = useState(null);
  const [accountUuid, setAccountUuid] = useState(null);
  const [saving, setSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const submitting = useRef(false);
  const today = debtToday();
  const { openTotal, overdueTotal, paidTotal, months, monthKeys, rows } = useMemo(
    () => summarizeDebts(debts, today), [debts, today],
  );
  const chartMonths = useMemo(() => monthKeys.slice(0, visibleMonths), [monthKeys]);
  const progress = paidTotal / (paidTotal + openTotal || 1);
  const shownMonths = showAllMonths ? monthKeys : chartMonths;
  const selectedAccount = !accountsLoading && !accountsError && accounts.find(account => account.uuid === accountUuid);

  async function confirmPayment() {
    if (!payment || !selectedAccount || submitting.current) { return; }
    submitting.current = true;
    setSaving(true);
    setPaymentError('');
    try {
      await pay(payment.uuid, payment.next.number, { accountUuid: selectedAccount.uuid, version: payment.version });
      setPayment(null);
      showToast({ type: 'success', message: 'Parcela paga. Saldo e extrato atualizados.' });
    } catch (cause) {
      setPaymentError(cause.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <GlassPanel style={s.panel}>
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.title}>Dívidas</Text>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel="Nova dívida" onPress={onCreate} style={s.add}>
        <Icon name="plus" size={18} color={colors.primary} />
        <Text style={s.action}>Nova dívida</Text>
      </AnimatedPressable>
    </View>
    {loading && !debts.length ? <ListSkeleton label="Carregando dívidas" count={2} /> : error ? (
      <View style={s.feedback}>
        <InlineNotice message={error} error />
        <PrimaryButton title="Tentar carregar dívidas novamente" onPress={retry} outlined icon={null} />
      </View>
    ) : debts.length === 0 ? (
      <View style={s.empty}>
        <Text style={s.subtitle}>Nenhuma dívida cadastrada</Text>
        <Text style={s.caption}>Adicione uma dívida para acompanhar as parcelas e os vencimentos.</Text>
      </View>
    ) : (
      <>
        <View style={s.summary}>
          <View style={s.metric}>
            <Text style={s.caption}>Total em aberto</Text>
            <Text style={s.total}>{formatCents(openTotal)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.caption}>A pagar neste mês</Text>
            <Text style={s.total}>{formatCents(months[today.slice(0, 7)] || 0)}</Text>
          </View>
          {overdueTotal > 0 && (
            <View style={s.metric}>
              <Text style={s.caption}>Em atraso</Text>
              <Text style={[s.total, s.overdue]}>{formatCents(overdueTotal)}</Text>
            </View>
          )}
        </View>
        <View style={s.chartPanel}>
          <View style={s.line}>
            <Text accessibilityRole="header" style={s.subtitle}>Progresso de pagamento</Text>
            <Text style={s.paidAmount}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={s.progressTrack} aria-hidden importantForAccessibility="no-hide-descendants">
            <View testID="debt-payment-progress-fill" style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={s.caption}>{formatCents(paidTotal)} pagos de {formatCents(paidTotal + openTotal)}</Text>
        </View>
        {shownMonths.length > 0 && (
          <View style={s.chartPanel}>
            <Text accessibilityRole="header" style={s.subtitle}>A pagar por mês</Text>
            <DebtMonthlyChart months={months} monthKeys={chartMonths} />
            {shownMonths.map(month => (
              <View key={month} style={s.line}>
                <Text style={s.caption}>{invoiceMonthLabel(month)}</Text>
                <Text style={s.amount}>{formatCents(months[month])}</Text>
              </View>
            ))}
            {monthKeys.length > visibleMonths && (
              <AnimatedPressable accessibilityRole="button" accessibilityState={{ expanded: showAllMonths }} aria-expanded={showAllMonths}
                onPress={() => setShowAllMonths(value => !value)} style={s.textButton}>
                <Text style={s.action}>{showAllMonths ? 'Mostrar menos meses' : 'Ver todos os meses'}</Text>
              </AnimatedPressable>
            )}
          </View>
        )}
        <View style={s.group}>
          <Text accessibilityRole="header" style={s.subtitle}>Minhas dívidas</Text>
          {rows.map(row => {
            const expanded = expandedDebt === row.uuid;
            const balance = row.next ? formatCents(row.open) : 'Quitada';
            return <View key={row.uuid} style={s.debt}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Detalhes da dívida de ${row.creditor}`}
                accessibilityHint={row.next ? `Saldo em aberto ${balance}` : balance}
                accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => onToggleDebt(row.uuid)}
                style={({ pressed }) => [s.debtTrigger, pressed && s.pressed]}>
                <View style={s.debtHeading}>
                  <View style={s.line}>
                    <Text style={[s.subtitle, s.creditor]}>{row.creditor}</Text>
                    <Text style={[s.amount, !row.next && s.paidAmount]}>{balance}</Text>
                  </View>
                  <Text style={[s.caption, row.next?.dueDate < today && s.overdue]}>
                    {row.next ? `Próxima em ${displayInvoiceDate(row.next.dueDate)}` : `${row.paidInstallments} de ${row.installmentCount} parcelas pagas`}
                  </Text>
                </View>
                <View style={expanded && s.chevronUp}>
                  <Icon name="chevronDown" size={18} color={colors.secondary} />
                </View>
              </Pressable>
              {expanded && <DebtDetails row={row} today={today} styles={s} colors={colors}
                onEdit={() => onEdit(row)} onPay={() => { setPaymentError(''); setAccountUuid(null); setPayment(row); }} />}
            </View>;
          })}
        </View>
      </>
    )}
    {payment && <ConfirmationDialog visible title="Pagar parcela?"
      message={`Parcela ${payment.next.number} de ${payment.installmentCount} para ${payment.creditor}, no valor de ${formatCurrency(payment.next.amount)}.`}
      confirmText="Pagar" loading={saving} confirmDisabled={!selectedAccount} error={paymentError}
      onConfirm={confirmPayment} onCancel={() => setPayment(null)}>
      <View style={s.accountList}>
        <Text style={s.subtitle}>Conta do pagamento</Text>
        {accountsLoading ? <ListSkeleton label="Carregando contas para pagamento" count={2} showAmount={false} />
          : accountsError ? <>
            <InlineNotice message={accountsError} error />
            <Pressable accessibilityRole="button" onPress={onRetryAccounts} style={s.textButton}>
              <Text style={s.action}>Tentar carregar contas novamente</Text>
            </Pressable>
          </> : accounts.length === 0 ? (
            <Text style={s.caption}>Cadastre uma conta para pagar a parcela.</Text>
          ) : accounts.map(account => (
            <Pressable key={account.uuid} accessibilityRole="button" accessibilityLabel={`Pagar com ${account.description || account.name}`}
              accessibilityHint={`Saldo de ${formatCurrency(account.balance)}`}
              accessibilityState={{ selected: accountUuid === account.uuid, disabled: saving }}
              disabled={saving} onPress={() => { setAccountUuid(account.uuid); setPaymentError(''); }}
              style={({ pressed, focused }) => [s.accountOption, accountUuid === account.uuid && s.selectedAccount,
                focused && s.focusedAccount, pressed && s.pressed]}>
              <InstitutionLogo institution={account.financialInstitution} fallbackIcon={account.type === 'CARTEIRA' ? 'wallet' : 'bank'} size={36} />
              <View style={s.debtHeading}>
                <Text style={s.subtitle}>{account.description || account.name}</Text>
                <Text style={s.caption}>Saldo: {formatCurrency(account.balance)}</Text>
              </View>
              {accountUuid === account.uuid && <Icon name="check" color={colors.primary} size={18} />}
            </Pressable>
          ))}
      </View>
    </ConfirmationDialog>}
  </GlassPanel>;
}

function DebtDetails({ row, today, styles: s, colors, onEdit, onPay }) {
  const [showAll, setShowAll] = useState(false);
  const installments = showAll ? row.installments : row.installments.slice(0, visibleInstallments);
  return <View style={s.details}>
    {!!row.description && <Text style={s.description}>{row.description}</Text>}
    <Text style={s.caption}>
      {formatCurrency(row.totalAmount)} no total · {row.paidInstallments} de {row.installmentCount} parcelas pagas
    </Text>
    {installments.length > 0 && <View style={s.installments}>
      <Text style={s.subtitle}>Parcelas em aberto</Text>
      {installments.map(item => (
        <View key={item.number} style={s.installment}>
          <View style={s.line}>
            <Text style={[s.caption, item.dueDate < today && s.overdue]}>Parcela {item.number}</Text>
            <Text style={s.amount}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={s.line}>
            <Text style={s.caption}>{displayInvoiceDate(item.dueDate)}</Text>
            {item.dueDate < today && <Text style={[s.caption, s.overdue]}>Em atraso</Text>}
          </View>
        </View>
      ))}
      {row.installments.length > visibleInstallments && (
        <AnimatedPressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} aria-expanded={showAll}
          onPress={() => setShowAll(value => !value)} style={s.textButton}>
          <Text style={s.action}>{showAll ? 'Mostrar menos parcelas' : 'Ver todas as parcelas'}</Text>
        </AnimatedPressable>
      )}
    </View>}
    <View style={s.controls}>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Editar dívida de ${row.creditor}`}
        onPress={onEdit} style={s.edit}>
        <Icon name="edit" size={16} color={colors.primary} />
        <Text style={s.action}>Editar dívida</Text>
      </AnimatedPressable>
      {row.next && <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Pagar parcela: ${row.creditor}`}
        onPress={onPay} style={[s.edit, s.pay]}>
        <Text style={s.payText}>Pagar parcela</Text>
      </AnimatedPressable>}
    </View>
  </View>;
}

const createStyles = colors => StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  title: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 17, lineHeight: 23 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    minHeight: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.primarySoft },
  action: { color: colors.primary, fontFamily: fontFamilyBold, fontSize: 13, lineHeight: 18 },
  empty: { gap: 5, paddingVertical: 8 },
  feedback: { gap: 10 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 14, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border },
  metric: { flexGrow: 1, flexBasis: 116, gap: 4 },
  total: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 19, fontVariant: ['tabular-nums'] },
  overdue: { color: colors.negative },
  paidAmount: { color: colors.positive, fontFamily: fontFamilyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.positive },
  chartPanel: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, gap: 8 },
  group: { gap: 8, paddingTop: 8 },
  subtitle: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 14, lineHeight: 20 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  amount: { color: colors.text, fontFamily: fontFamilyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  caption: { color: colors.secondary, fontFamily, fontSize: 13, lineHeight: 19 },
  debt: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  debtTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, minHeight: 60 },
  debtHeading: { flex: 1, minWidth: 0, gap: 4 },
  creditor: { flexShrink: 1, minWidth: 0 },
  pressed: { opacity: 0.72 },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  details: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  description: { color: colors.text, fontFamily, fontSize: 14, lineHeight: 21 },
  installments: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  installment: { gap: 2 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  edit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6, backgroundColor: colors.primarySoft },
  pay: { backgroundColor: colors.brandPrimary },
  payText: { color: colors.onBrand, fontFamily: fontFamilyBold, fontSize: 13, lineHeight: 18 },
  accountList: { marginTop: 18, gap: 8 },
  accountOption: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  selectedAccount: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  focusedAccount: { borderColor: colors.primary },
  textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
});
