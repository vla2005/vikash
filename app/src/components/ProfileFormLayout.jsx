import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { Info } from 'phosphor-react-native/src/icons/Info';
import { LockSimple } from 'phosphor-react-native/src/icons/LockSimple';
import Screen from './Screen';
import PrimaryButton from './PrimaryButton';
import InlineNotice from './InlineNotice';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function ProfileFormLayout({ title, children, notice, secure = false, submitText, onSubmit, onBack, saving, error }) {
  const NoticeIcon = secure ? LockSimple : Info;
  return <Screen contentStyle={styles.content}>
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao perfil" disabled={saving} onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><CaretLeft size={25} color={colors.text} /></Pressable>
      <Text accessibilityRole="header" style={styles.navTitle}>{title}</Text><View style={styles.back} />
    </View>
    {children}
    <View style={[styles.notice, secure && styles.compactNotice]}><NoticeIcon size={27} color={colors.primary} /><Text style={styles.noticeText}>{notice}</Text></View>
    <View style={[styles.footer, secure && styles.compactFooter]}>
      <InlineNotice message={error} error />
      <PrimaryButton title={submitText} onPress={onSubmit} loading={saving} icon={null} />
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" disabled={saving} onPress={onBack} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
    </View>
  </Screen>;
}

export const profileFormStyles = StyleSheet.create({
  heading: { marginTop: 26, gap: 7 },
  title: { fontFamily: fontFamilyBold, fontSize: 32, lineHeight: 41, letterSpacing: -1, fontWeight: '700', color: colors.text },
  subtitle: { fontFamily, fontSize: 17, lineHeight: 25, color: colors.secondary },
  fields: { marginTop: 26, gap: 22 },
  input: { minHeight: 52, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 },
});

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingHorizontal: 20, justifyContent: 'flex-start' },
  nav: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamilyBold, fontSize: 21, lineHeight: 28, letterSpacing: -0.5, fontWeight: '700', color: colors.text },
  notice: { marginTop: 24, padding: 17, minHeight: 64, borderRadius: 20, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 15 },
  noticeText: { flex: 1, fontFamily, fontSize: 14, lineHeight: 21, color: colors.text },
  compactNotice: { padding: 14 },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: 40, gap: 10 },
  compactFooter: { paddingTop: 24 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: colors.primary },
  pressed: { opacity: 0.72 },
});
