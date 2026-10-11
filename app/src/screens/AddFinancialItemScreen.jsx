import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import IconTile from '../components/IconTile';
import { fontFamilyMedium, fontFamily } from '../theme';

export default function AddFinancialItemScreen({ navigation, route, onChoose, onCancel }) {
  const { typography, colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const choose = kind => onChoose ? onChoose(kind) : navigation.navigate(kind === 'account' ? 'CreateAccount' : 'CreateCreditCard', { ...route?.params, fromChoice: true });
  return <Screen contentStyle={styles.content}>
    <View style={styles.top}><Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12} onPress={onCancel || (() => navigation.goBack())}><Icon name="back" /></Pressable><Text style={styles.topTitle}>Adicionar</Text><View style={styles.spacer} /></View>
    <View style={styles.brand}><BrandLogo /></View>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>O que você quer adicionar?</Text><Text style={typography.body}>Organize seu dinheiro e seus cartões.</Text></View>
    <View style={styles.options}>
      {[{ kind: 'account', title: 'Conta', icon: 'wallet', description: 'Conta corrente, poupança, carteira ou investimentos.' }, { kind: 'card', title: 'Cartão de crédito', icon: 'creditCard', description: 'Limite, faturas e compras parceladas.' }].map(option => <Pressable key={option.kind} accessibilityRole="button" accessibilityLabel={`Adicionar ${option.title.toLowerCase()}`} onPress={() => choose(option.kind)} style={({ pressed }) => [styles.option, option.kind === 'account' && styles.account, pressed && styles.pressed]}>
        <IconTile tone={option.kind === 'account' ? 'primary' : 'info'} size={48}><Icon name={option.icon} size={28} color={option.kind === 'account' ? colors.primary : colors.info} /></IconTile><View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.description}>{option.description}</Text></View><Icon name="chevron" color={colors.secondary} size={20} />
      </Pressable>)}
    </View>
    <View style={styles.bottom}><View style={styles.notice}><Icon name="info" color={colors.primary} size={23} /><Text style={styles.noticeText}>Conta e cartão têm controles separados.</Text></View><Text style={styles.hint}>Você pode adicionar outros depois.</Text></View>
  </Screen>;
}
const createStyles = (colors, typography) => StyleSheet.create({
  content: { justifyContent: 'flex-start' }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topTitle: { fontFamily, fontSize: 16, color: colors.text }, spacer: { width: 24 },
  brand: { alignItems: 'center', marginTop: 42, marginBottom: 36 }, heading: { gap: 12 }, title: { ...typography.title, fontSize: 34, lineHeight: 40 },
  options: { gap: 16, marginTop: 30 }, option: { minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 20 }, account: { borderColor: colors.primary }, optionCopy: { flex: 1, gap: 7 }, optionTitle: { fontFamily: fontFamilyMedium, fontSize: 20, fontWeight: '600', color: colors.text }, description: { ...typography.body, fontSize: 14, lineHeight: 21 }, pressed: { opacity: 0.75 },
  bottom: { marginTop: 'auto', paddingTop: 40, gap: 18 }, notice: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, noticeText: { fontFamily, color: colors.primary, fontSize: 14, lineHeight: 20, flex: 1 }, hint: { ...typography.body, textAlign: 'center', fontSize: 13 },
});
