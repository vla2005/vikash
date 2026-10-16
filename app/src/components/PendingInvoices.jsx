import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { creditCardLabel } from '../utils/creditCards';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import { ListSkeleton } from './Skeleton';
import { AnimatedPressable } from './motion/AnimatedPrimitives';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function PendingInvoices({
  invoices = [],
  loading,
  error,
  onRetry,
  hidden,
  onOpenCard,
  onViewAll,
}) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return (
    <View style={s.section}>
      <View style={s.heading}>
        <View style={s.titleGroup}>
          <Text style={s.eyebrow}>COMPROMISSOS DE CRÉDITO</Text>
          <Text accessibilityRole="header" style={s.title}>
            Faturas a pagar
          </Text>
        </View>
        {!!onViewAll && (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos os cartões"
            scaleActive={0.95}
            onPress={onViewAll}
            style={s.linkPill}
          >
            <Text style={s.link}>Ver todas</Text>
          </AnimatedPressable>
        )}
      </View>
      <Text style={s.caption}>Pendentes atuais · atrasadas primeiro</Text>

      {loading ? (
        <ListSkeleton label="Carregando faturas" count={3} />
      ) : error ? (
        <GlassPanel style={s.panel}>
          <Text accessibilityRole="alert" style={s.caption}>
            {error}
          </Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar crédito novamente"
            scaleActive={0.95}
            onPress={onRetry}
            style={s.linkButton}
          >
            <Text style={s.link}>Tentar novamente</Text>
          </AnimatedPressable>
        </GlassPanel>
      ) : (
        <GlassPanel style={s.panel}>
          {invoices.length ? (
            <View style={s.ticketList}>
              {invoices.slice(0, 3).map((invoice, index) => {
                const overdue = invoice.dueDate < todayKey;
                const dueDate = new Date(
                  invoice.dueDate + 'T12:00:00',
                ).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <AnimatedPressable
                    key={invoice.uuid}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir fatura de ${creditCardLabel(
                      invoice.creditCard,
                    )}, vencimento ${invoice.dueDate}`}
                    scaleActive={0.98}
                    onPress={() =>
                      onOpenCard?.(invoice.creditCard.uuid, invoice.uuid)
                    }
                    style={[s.row, index > 0 && s.divider]}
                  >
                    <InstitutionLogo
                      institution={invoice.creditCard.financialInstitution}
                      size={38}
                    />
                    <View style={s.copy}>
                      <Text numberOfLines={2} style={s.name}>
                        {creditCardLabel(invoice.creditCard)}
                      </Text>
                      <Text style={[s.caption, overdue && s.overdue]}>
                        {overdue
                          ? 'Atrasada · '
                          : invoice.dueDate === todayKey
                          ? 'Vence hoje · '
                          : 'Vence '}
                        {dueDate}
                      </Text>
                    </View>
                    <Text style={s.amount}>
                      {hidden ? hiddenAmount : formatCurrency(invoice.total)}
                    </Text>
                    <Icon name="chevron" size={16} color={colors.secondary} />
                  </AnimatedPressable>
                );
              })}
            </View>
          ) : (
            <View style={s.empty}>
              <Icon name="check" size={22} color={colors.positive} />
              <Text style={s.caption}>
                Nenhuma fatura pendente nos seus cartões.
              </Text>
            </View>
          )}
        </GlassPanel>
      )}
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    section: { marginTop: 22 },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    titleGroup: { flex: 1, gap: 2 },
    eyebrow: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.1,
      color: colors.primary,
    },
    title: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    linkPill: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.28)',
      justifyContent: 'center',
    },
    linkButton: { minHeight: 44, justifyContent: 'center' },
    link: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 12,
      color: colors.primary,
    },
    caption: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 6,
      marginTop: 10,
    },
    ticketList: {
      gap: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 78,
      paddingVertical: 14,
    },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    name: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    amount: {
      maxWidth: '35%',
      flexShrink: 1,
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 21,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    overdue: { color: colors.negative },
    empty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 20,
    },
  });
