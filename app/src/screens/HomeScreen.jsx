import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import AnimatedMicButton from '../components/AnimatedMicButton';
import { fontFamilyMedium, colors, fontFamily, fontFamilyBold } from '../theme';

export default function HomeScreen({ profile, onMicrophone, onNavigate }) {
  const name = profile?.name?.trim().split(/\s+/)[0];
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <BrandLogo width={126} />
    <Text style={s.greeting}>{name ? `Olá, ${name}.` : 'Olá, que bom ter você aqui.'}</Text>
    <Text accessibilityRole="header" style={s.title}>O que você movimentou hoje?</Text>
    <View style={s.voice}>
      <View style={s.microphone}><AnimatedMicButton large animate={false} diameter={78} onPress={onMicrophone} /></View>
      <Text style={s.voiceTitle}>Conte o que aconteceu</Text>
      <Text style={s.description}>Uma compra, um Pix ou uma entrada. Fale e confira o texto antes de registrar.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Começar registro por voz" onPress={onMicrophone} style={({ pressed }) => [s.start, pressed && s.pressed]}><Text style={s.startText}>Registrar por voz</Text><Icon name="microphone" size={20} color={colors.surface} /></Pressable>
      <View style={s.steps}>{['Fale', 'Revise', 'Confirme'].map((step, index) => <View key={step} style={s.step}><View style={s.number}><Text style={s.numberText}>{index + 1}</Text></View><Text style={s.caption}>{step}</Text></View>)}</View>
    </View>
    <Text style={s.sectionTitle}>Acompanhe seu dinheiro</Text>
    <View style={s.links}>{[{ key: 'Statement', label: 'Ver extrato', subtitle: 'Suas movimentações', icon: 'statement' }, { key: 'AccountManagement', label: 'Contas e cartões', subtitle: 'Saldos, faturas e limites', icon: 'walletFilled' }].map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onNavigate?.(item.key)} style={({ pressed }) => [s.link, pressed && s.pressed]}><View style={s.linkIcon}><Icon name={item.icon} color={colors.primary} size={24} /></View><View style={s.linkCopy}><Text style={s.linkTitle}>{item.label}</Text><Text style={s.caption}>{item.subtitle}</Text></View><Icon name="chevron" color={colors.secondary} size={18} /></Pressable>)}</View>
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 22, paddingBottom: 28 }, greeting: { fontFamily, fontSize: 15, lineHeight: 23, color: colors.secondary, marginTop: 30 },
  title: { fontFamily: fontFamilyBold, fontSize: 30, lineHeight: 39, letterSpacing: -1, color: colors.text, fontWeight: '700', marginTop: 8, marginBottom: 24 },
  voice: { padding: 22, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center' }, microphone: { marginTop: 14, marginBottom: 28 },
  voiceTitle: { fontFamily: fontFamilyBold, fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.text }, description: { fontFamily, fontSize: 13, lineHeight: 21, color: colors.secondary, textAlign: 'center', marginTop: 8 },
  start: { marginTop: 22, minHeight: 50, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, alignSelf: 'stretch' }, startText: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.surface },
  steps: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 22, gap: 8 }, step: { flexDirection: 'row', alignItems: 'center', gap: 5 }, number: { width: 19, height: 19, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, numberText: { fontFamily, fontSize: 10, color: colors.primary }, caption: { fontFamily, fontSize: 11, lineHeight: 18, color: colors.secondary },
  sectionTitle: { fontFamily: fontFamilyBold, fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 26, marginBottom: 12 }, links: { backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 16 }, link: { minHeight: 74, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, linkIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, linkCopy: { flex: 1, gap: 4 }, linkTitle: { fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '600', color: colors.text }, pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
