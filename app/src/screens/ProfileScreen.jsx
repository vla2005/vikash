import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { Key } from 'phosphor-react-native/src/icons/Key';
import { PencilSimple } from 'phosphor-react-native/src/icons/PencilSimple';
import { Question } from 'phosphor-react-native/src/icons/Question';
import { SignOut } from 'phosphor-react-native/src/icons/SignOut';
import { User } from 'phosphor-react-native/src/icons/User';
import ConfirmationDialog from '../components/ConfirmationDialog';
import useToast from '../hooks/useToast';
import { getProfileInitials } from '../utils/profile';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function ProfileScreen({ profile, onBack, onLogout, onEdit, onPassword, onSupport }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const name = profile?.name?.trim() || 'Seu perfil';

  async function confirmLogout() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true); setError('');
    try {
      await onLogout();
      setConfirmVisible(false);
      showToast({ type: 'success', message: 'Você saiu da sua conta.' });
    } catch (failure) {
      setError(failure.message || 'Não foi possível sair agora. Tente novamente.');
    } finally { submitting.current = false; setSaving(false); }
  }

  return <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={s.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar do perfil" disabled={saving} onPress={onBack} style={({ pressed }) => [s.back, pressed && s.pressed]}><CaretLeft size={25} color={colors.text} /></Pressable>
        <Text accessibilityRole="header" style={s.navTitle}>Meu perfil</Text><View style={s.back} />
      </View>
      <View style={s.identity}>
        <View style={s.avatar} accessible={false}><Text style={s.initials}>{getProfileInitials(name)}</Text></View>
        <View style={s.identityCopy}><Text style={s.name}>{name}</Text><Text style={s.subtitle}>Sua conta no Vikash</Text></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={onEdit} style={({ pressed }) => [s.edit, pressed && s.pressed]}><PencilSimple size={25} color={colors.primary} /><Text style={s.editText}>Editar perfil</Text></Pressable>

      <View style={s.personalSection}>
        <Text accessibilityRole="header" style={s.heading}>Dados pessoais</Text>
        <View style={s.group}>
          <View style={s.row}><User size={26} color={colors.secondary} /><View style={s.copy}><Text style={s.label}>Nome</Text><Text style={s.value}>{name}</Text></View></View>
          <View style={[s.row, s.divider]}><EnvelopeSimple size={26} color={colors.secondary} /><View style={s.copy}><Text style={s.label}>E-mail</Text><Text style={s.value}>{profile?.email || 'Não informado'}</Text></View></View>
        </View>
      </View>
      <View style={s.securitySection}>
        <Text accessibilityRole="header" style={s.heading}>Segurança</Text>
        <View style={s.group}>
          <Pressable accessibilityRole="button" accessibilityLabel="Alterar senha" onPress={onPassword} style={({ pressed }) => [s.row, pressed && s.pressed]}>
            <Key size={28} color={colors.secondary} /><View style={s.copy}><Text style={s.value}>Alterar senha</Text><Text style={s.description}>Atualize sua senha de acesso</Text></View><CaretRight size={23} color={colors.secondary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ajuda e suporte" onPress={onSupport} style={({ pressed }) => [s.row, s.divider, pressed && s.pressed]}>
            <Question size={28} color={colors.secondary} /><Text style={[s.value, s.support]}>Ajuda e suporte</Text><CaretRight size={23} color={colors.secondary} />
          </Pressable>
        </View>
      </View>
      <View style={s.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" disabled={saving} onPress={() => { setError(''); setConfirmVisible(true); }} style={({ pressed }) => [s.logout, pressed && s.pressed]}><SignOut size={27} color={colors.negative} /><Text style={s.logoutText}>Sair da conta</Text></Pressable>
        <Text style={s.brand}>Vikash</Text>
      </View>
    </ScrollView>
    <ConfirmationDialog visible={confirmVisible} title="Sair da conta?" message="Você precisará entrar novamente para acessar seus dados."
      confirmText="Sair" cancelText="Continuar no app" variant="danger" icon="info" loading={saving} error={error}
      onConfirm={confirmLogout} onCancel={() => { if (!submitting.current) setConfirmVisible(false); }} />
  </>;
}

const s = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontFamily: fontFamilyBold, fontSize: 21, lineHeight: 28, letterSpacing: -0.5, color: colors.text, fontWeight: '700' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 26 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCE3FF', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 38, lineHeight: 49, color: colors.text, letterSpacing: -1 },
  identityCopy: { flex: 1, minWidth: 0, gap: 6 },
  name: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 25, lineHeight: 32, color: colors.text, letterSpacing: -0.8 },
  subtitle: { fontFamily, fontSize: 17, lineHeight: 25, color: colors.secondary },
  edit: { marginTop: 16, minHeight: 48, padding: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 16, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  editText: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 17, color: colors.primary },
  personalSection: { marginTop: 32 }, securitySection: { marginTop: 30 },
  heading: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 21, lineHeight: 28, color: colors.text, letterSpacing: -0.4, marginBottom: 12 },
  group: { backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 74, paddingVertical: 14, paddingHorizontal: 6 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  label: { fontFamily, fontSize: 13, lineHeight: 18, color: colors.secondary },
  value: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.text },
  description: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary },
  support: { flex: 1 },
  footer: { flex: 1, justifyContent: 'flex-end', marginTop: 32 },
  logout: { minHeight: 62, borderRadius: 18, padding: 16, backgroundColor: '#F9E9ED', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutText: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 17, color: colors.negative },
  brand: { fontFamily, color: colors.secondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 24 },
  pressed: { opacity: 0.72 },
});
