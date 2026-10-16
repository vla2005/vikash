import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import Icon from './Icon';
import HomeAccountRow from './HomeAccountRow';
import HomeCreditCards from './HomeCreditCards';
import { AnimatedPressable } from './motion/AnimatedPrimitives';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function HomeAccountsAndCards({
  accounts = [],
  cards = [],
  profile,
  hidden = false,
  onOpenAccount,
  onOpenCard,
  onViewAll,
  onStackInteractionChange,
}) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);

  return (
    <View style={s.section}>
      <View style={s.heading}>
        <View style={s.titleGroup}>
          <Text style={s.eyebrow}>CARTEIRA & CRÉDITO</Text>
          <Text accessibilityRole="header" style={s.title}>
            Contas e cartões
          </Text>
        </View>
        {!!onViewAll && (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Ver contas e cartões"
            scaleActive={0.95}
            onPress={onViewAll}
            style={s.all}
          >
            <Text style={s.link}>Ver todos</Text>
            <Icon name="chevron" size={14} color={colors.primary} />
          </AnimatedPressable>
        )}
      </View>

      <GlassPanel style={s.panel}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Contas
        </Text>
        {accounts.length ? (
          accounts.slice(0, 3).map((account, index) => (
            <View key={account.uuid}>
              {index > 0 && <View style={s.separator} />}
              <HomeAccountRow
                account={account}
                hidden={hidden}
                onOpen={onOpenAccount}
              />
            </View>
          ))
        ) : (
          <Text style={s.empty}>
            Adicione uma conta para acompanhar seu saldo.
          </Text>
        )}
        {accounts.length > 3 && (
          <Text style={s.note}>
            Até 3 contas. Acesse “Ver todos” para a lista completa.
          </Text>
        )}
      </GlassPanel>

      <HomeCreditCards
        cards={cards}
        profile={profile}
        hidden={hidden}
        onOpenCard={onOpenCard}
        title="Cartões de crédito"
        compactHeading
        scrollable
        onStackInteractionChange={onStackInteractionChange}
      />
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
      marginBottom: 12,
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
    all: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.28)',
    },
    link: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 12,
      color: colors.primary,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 10,
    },
    subtitle: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.secondary,
      paddingBottom: 10,
      marginBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    separator: {
      height: 8,
    },
    empty: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
      paddingVertical: 12,
    },
    note: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
      paddingTop: 8,
      paddingBottom: 8,
    },
  });
