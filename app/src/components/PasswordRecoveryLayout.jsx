import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { CheckCircle } from 'phosphor-react-native/src/icons/CheckCircle';
import Screen from './Screen';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import { fontFamily } from '../theme';

export default function PasswordRecoveryLayout({ children, title, description, onBack, backLabel = 'Voltar ao login', saving, symbol = 'email' }) {
  const { colors, typography } = useTheme();
  const styles = useThemeStyles(createStyles);
  const Symbol = symbol === 'success' ? CheckCircle : symbol === 'password' ? ShieldCheck : EnvelopeSimple;
  return <Screen contentStyle={styles.content}>
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel} disabled={saving} onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Icon name="back" size={26} /></Pressable>
      <BrandLogo width={126} />
    </View>
    <View style={[styles.symbol, symbol === 'success' && styles.success]} accessible={false}>
      <Symbol size={34} color={symbol === 'success' ? colors.positive : colors.primary} />
    </View>
    <View style={styles.heading}><Text accessibilityRole="header" style={typography.title}>{title}</Text>
      <Text style={typography.body}>{description}</Text></View>
    {children}
  </Screen>;
}

export const useRecoveryStyles = () => useThemeStyles(createRecoveryStyles);
const createRecoveryStyles = colors => StyleSheet.create({
  form: { marginTop: 26, padding: 20, borderRadius: 24, backgroundColor: colors.surface, gap: 18 },
  actions: { marginTop: 24, gap: 12 },
  notice: { padding: 16, borderRadius: 16, backgroundColor: colors.primarySoft, marginTop: 22 },
  text: { fontFamily, fontSize: 14, lineHeight: 22, color: colors.secondary },
});

const createStyles = (colors) => StyleSheet.create({
  content: { justifyContent: 'flex-start', paddingTop: 28 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: -10 },
  symbol: { width: 68, height: 68, borderRadius: 20, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginTop: 44 },
  success: { backgroundColor: colors.positiveSoft },
  heading: { marginTop: 22, gap: 12 },
  pressed: { opacity: 0.72 },
});
