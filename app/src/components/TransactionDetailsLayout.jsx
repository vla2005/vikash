import ScrollView from './silver/DockScrollView';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DetailsSkeleton } from './Skeleton';
import Icon from './Icon';
import GlassBackButton from './GlassBackButton';
import CategoryIcon from './CategoryIcon';
import InstitutionLogo from './InstitutionLogo';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';

export function DetailRow({ label, value, institution, icon, color, backgroundColor, onPress }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const content = <>
    {(institution || icon) && <View style={[s.rowIcon, backgroundColor && { backgroundColor }]}>{institution
      ? <InstitutionLogo institution={institution} size={38} />
      : <CategoryIcon name={icon} size={23} color={color || colors.secondary} />}</View>}
    <View style={s.rowValue}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>
    {onPress && <Icon name="chevron" size={17} color={colors.secondary} />}
  </>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>{content}</Pressable>
    : <View style={s.row}>{content}</View>;
}

export function CategoryRow({ category }) {
  const { categoryColors } = useTheme();
  const palette = categoryColors.find(item => item.key === category?.color) || categoryColors.find(item => item.key === 'gray');
  return <DetailRow label="Categoria" value={category?.name || 'Sem categoria'} icon={category?.icon || 'wallet'} color={palette.foreground} backgroundColor={palette.background} />;
}

function dateParts(value) {
  const [date, time = ''] = value.split('T');
  return { date: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }), time: time.slice(0, 5) };
}

export default function TransactionDetailsLayout({ title, details, loading, error, retry, onBack, subtitle, amountLabel, sign = '', amountTone, heroAction, children }) {
  const { categoryColors } = useTheme();
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const palette = categoryColors.find(item => item.key === details?.category?.color) || categoryColors.find(item => item.key === 'gray');
  const occurred = details ? dateParts(details.occurredAt) : null;
  const tone = amountTone || (sign === '+ ' ? 'positive' : sign === '− ' ? 'negative' : 'primary');
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <View style={s.nav}><GlassBackButton accessibilityLabel="Voltar à lista" onPress={onBack} /><Text accessibilityRole="header" style={s.navTitle}>{title}</Text><View style={s.action} /></View>
    {loading ? <DetailsSkeleton label="Carregando detalhes do lançamento" />
      : error ? <View style={s.feedback}><Icon name="warning" size={32} color={colors.error} /><Text accessibilityRole="alert" style={s.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [s.retry, pressed && s.pressed]}><Text style={s.link}>Tentar novamente</Text></Pressable></View>
        : details && <>
          <View style={s.hero}>
            <View style={s.identity}><View style={[s.tile, { backgroundColor: palette.accent }]}><CategoryIcon name={details.category?.icon || 'wallet'} size={27} color={palette.onAccent} /></View>
              <View style={s.identityText}><Text style={s.eyebrow}>{subtitle}</Text><Text accessibilityRole="header" style={s.title}>{details.description}</Text></View>
              {heroAction}
            </View>
            <View style={[s.amountArea, { backgroundColor: colors[`${tone}Soft`] }]}><Text style={[s.label, { color: colors[tone] }]}>{amountLabel}</Text><Text style={[s.amount, { color: colors[tone] }]} numberOfLines={1} adjustsFontSizeToFit>{sign}{formatCurrency(details.amount)}</Text></View>
            <View style={s.date}><View style={s.dateDot} /><Text style={s.dateText}>{occurred.date}</Text><Text style={s.dateTime}>{occurred.time}</Text></View>
          </View>{children}
        </>}
  </ScrollView>;
}

export const useDetailStyles = () => useThemeStyles(createDetailStyles);
const createDetailStyles = colors => StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 2, marginBottom: 26, overflow: 'hidden' },
  section: { fontFamily: fontFamilyBold, fontSize: 18, fontWeight: '700', letterSpacing: -0.4, color: colors.text, marginBottom: 13 },
  text: { fontFamily, fontSize: 16, lineHeight: 25, color: colors.text },
  block: { backgroundColor: colors.surface, borderRadius: 14, padding: 17, marginBottom: 22 },
  muted: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  link: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.primary, fontWeight: '600' },
});
const createStyles = (colors) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 22 },
  navTitle: { fontFamily: fontFamilyMedium, fontSize: 18, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  hero: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 28 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  identityText: { flex: 1, gap: 5 },
  tile: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 17, fontWeight: '600', color: colors.secondary },
  title: { fontFamily: fontFamilyBold, fontSize: 23, lineHeight: 29, letterSpacing: -0.6, fontWeight: '700', color: colors.text },
  amountArea: { padding: 16, marginVertical: 20, borderRadius: 16, gap: 5 },
  amount: { fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 44, letterSpacing: -1, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  date: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  dateText: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary, flexShrink: 1 },
  dateTime: { fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.secondary, marginLeft: 'auto' },
  label: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary },
  row: { minHeight: 72, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rowValue: { flex: 1, gap: 4 },
  value: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text },
  feedback: { paddingVertical: 60, alignItems: 'center', gap: 18 },
  errorText: { fontFamily, fontSize: 15, lineHeight: 23, color: colors.secondary, textAlign: 'center' },
  retry: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.primarySoft },
  link: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.primary },
});
