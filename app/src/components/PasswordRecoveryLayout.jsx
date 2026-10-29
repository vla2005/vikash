import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { CheckCircle } from 'phosphor-react-native/src/icons/CheckCircle';
import Screen from './Screen';
import BrandLogo from './BrandLogo';
import GlassBackButton from './GlassBackButton';
import GlassPanel from './silver/GlassPanel';
import ScreenTransition from './ScreenTransition';
import { fontFamily, fontFamilyBold } from '../theme';

export default function PasswordRecoveryLayout({
  children,
  title,
  description,
  onBack,
  backLabel = 'Voltar ao login',
  saving,
  symbol = 'email',
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const Symbol =
    symbol === 'success'
      ? CheckCircle
      : symbol === 'password'
      ? ShieldCheck
      : EnvelopeSimple;
  const accent = symbol === 'success' ? colors.positive : colors.primary;
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.nav}>
        <GlassBackButton
          accessibilityLabel={backLabel}
          disabled={saving}
          onPress={onBack}
        />
        <BrandLogo width={126} />
        <View style={styles.navSpacer} accessible={false} />
      </View>
      <ScreenTransition sceneKey={title} fade>
        <GlassPanel
          testID="recovery-symbol"
          accentColor={accent}
          style={[styles.symbol, symbol === 'success' && styles.success]}
          accessible={false}
        >
          <Symbol size={32} color={accent} />
        </GlassPanel>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {children}
      </ScreenTransition>
    </Screen>
  );
}

export const useRecoveryStyles = () => useThemeStyles(createRecoveryStyles);
const createRecoveryStyles = colors =>
  StyleSheet.create({
    form: { marginTop: 28, padding: 20, gap: 20 },
    actions: { marginTop: 28, gap: 12 },
    notice: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginTop: 24,
    },
    text: { fontFamily, fontSize: 14, lineHeight: 22, color: colors.secondary },
  });

const createStyles = colors =>
  StyleSheet.create({
    content: {
      justifyContent: 'flex-start',
      paddingTop: 24,
      paddingHorizontal: 24,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    navSpacer: { width: 44 },
    symbol: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 52,
    },
    success: { backgroundColor: colors.positiveSoft },
    heading: { marginTop: 24, gap: 12 },
    title: {
      fontFamily: fontFamilyBold,
      fontSize: 32,
      lineHeight: 41,
      letterSpacing: -1,
      color: colors.text,
    },
    description: {
      fontFamily,
      fontSize: 16,
      lineHeight: 25,
      color: colors.secondary,
    },
  });
