import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { SignOut } from 'phosphor-react-native/src/icons/SignOut';
import { UserCircle } from 'phosphor-react-native/src/icons/UserCircle';
import DrawerPanel from './DrawerPanel';
import DrawerModal from './DrawerModal';
import Icon from './Icon';
import InlineNotice from './InlineNotice';
import ConfirmationDialog from './ConfirmationDialog';
import useToast from '../hooks/useToast';
import { getProfileInitials } from '../utils/profile';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function ProfileSwitcherDrawer({ visible, profiles = [], activeProfileId,
  onClose, onSelect, onAdd, onOpenProfile, onLogout, onRequireLogin }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const closeButton = useRef(null);
  const busy = useRef(false);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(null);
  const { showToast } = useToast();

  function close() {
    if (busy.current) { return; }
    setError(''); setLeaving(null); onClose();
  }
  async function select(profile) {
    if (busy.current || profile.id === activeProfileId) { return; }
    if (profile.requiresLogin) { close(); onRequireLogin(profile); return; }
    busy.current = true; setPendingId(profile.id); setError('');
    try {
      await onSelect(profile.id);
      onClose();
      showToast({ type: 'success', message: `Você está usando a conta de ${profile.name}.` });
    } catch (cause) {
      if ([401, 403].includes(cause.status)) {
        onClose(); onRequireLogin(profile);
        showToast({ type: 'info', message: 'Entre novamente nesta conta. Seus outros perfis continuam salvos.' });
      } else { setError(cause.message || 'Não foi possível trocar de conta. Confira a conexão e tente novamente.'); }
    } finally { busy.current = false; setPendingId(null); }
  }
  async function confirmLogout() {
    if (!leaving || busy.current) { return; }
    busy.current = true; setPendingId(leaving.id); setError('');
    try {
      await onLogout(leaving.id);
      setLeaving(null);
      showToast({ type: 'success', message: 'Você saiu desta conta.' });
    } catch (cause) { setError(cause.message || 'Não foi possível sair. Tente novamente.'); }
    finally { busy.current = false; setPendingId(null); }
  }

  return <DrawerModal visible={visible}
    onRequestClose={close} onShow={() => closeButton.current?.focus?.()}>
    <View style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar troca de perfis" disabled={pendingId !== null}
        onPress={close} style={StyleSheet.absoluteFill} />
      <DrawerPanel style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 24), marginTop: insets.top + 24 }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>Seus perfis</Text>
          <Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel="Fechar perfis" disabled={pendingId !== null}
            onPress={close} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><Icon name="close" size={22} /></Pressable>
        </View>
        <Text style={s.description}>Escolha a conta que deseja usar.</Text>
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {profiles.map(profile => {
            const active = profile.id === activeProfileId;
            return <View key={profile.id} style={s.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Usar perfil de ${profile.name}, ${profile.email}`}
                accessibilityState={{ selected: active, disabled: active || pendingId !== null, busy: pendingId === profile.id }}
                disabled={active || pendingId !== null} onPress={() => select(profile)}
                style={({ pressed }) => [s.profile, pressed && s.pressed]}>
                <View style={[s.avatar, active && s.activeAvatar]}><Text style={[s.initials, active && s.activeInitials]}>{getProfileInitials(profile.name)}</Text></View>
                <View style={s.copy}>
                  <Text style={s.name}>{profile.name}</Text><Text style={s.email}>{profile.email}</Text>
                  {active ? <View style={s.status}><Check size={13} color={colors.primary} weight="bold" /><Text style={s.statusText}>Em uso</Text></View>
                    : profile.requiresLogin && <Text style={s.loginHint}>Entrar novamente</Text>}
                </View>
                {pendingId === profile.id && <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Aguarde" />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Sair da conta de ${profile.name}`} disabled={pendingId !== null}
                onPress={() => { setError(''); setLeaving(profile); }} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}>
                <SignOut size={22} color={colors.secondary} />
              </Pressable>
            </View>;
          })}
          {!profiles.length && <Text style={s.description}>Adicione uma conta para começar.</Text>}
        </ScrollView>
        {!leaving && <InlineNotice message={error} error />}
        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Adicionar conta" disabled={pendingId !== null}
            onPress={() => { close(); onAdd(); }} style={({ pressed }) => [s.add, pressed && s.pressed]}>
            <Plus size={22} color={colors.primary} /><Text style={s.addText}>Adicionar conta</Text>
          </Pressable>
          {onOpenProfile && <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu perfil" disabled={pendingId !== null}
            onPress={() => { close(); onOpenProfile(); }} style={({ pressed }) => [s.settings, pressed && s.pressed]}>
            <UserCircle size={22} color={colors.secondary} /><Text style={s.settingsText}>Meu perfil</Text>
          </Pressable>}
        </View>
      </DrawerPanel>
      <ConfirmationDialog visible={!!leaving} title="Sair desta conta?"
        message={`A sessão de ${leaving?.name || ''} será removida deste aparelho. Os outros perfis continuarão salvos.`}
        confirmText="Sair desta conta" variant="danger" icon="info" loading={pendingId !== null} error={error}
        onConfirm={confirmLogout} onCancel={() => { if (!busy.current) { setLeaving(null); setError(''); } }} />
    </View>
  </DrawerModal>;
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: colors.dialogBackdrop },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '85%', paddingHorizontal: 24, paddingTop: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 25, lineHeight: 33, color: colors.text },
  description: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.secondary, marginTop: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  list: { flexShrink: 1, marginTop: 20 }, listContent: { paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  profile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, minHeight: 80 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  activeAvatar: { backgroundColor: colors.primary },
  initials: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 17, color: colors.text }, activeInitials: { color: colors.onPrimary },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 16, lineHeight: 23, color: colors.text },
  email: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 18, color: colors.primary },
  loginHint: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary },
  actions: { gap: 8, marginTop: 22 },
  add: { minHeight: 52, borderRadius: 16, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 },
  addText: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 15, color: colors.primary },
  settings: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  settingsText: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.secondary },
  pressed: { opacity: 0.72 },
});
