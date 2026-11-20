import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { Fingerprint } from 'phosphor-react-native/src/icons/Fingerprint';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { fontFamily } from '../theme';
import IconTile from './IconTile';
import InlineNotice from './InlineNotice';

export default function BiometricSettings() {
  const auth = useOnboarding();
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  if (Platform.OS === 'web' || !auth) return null;
  const enabled = !!auth.session?.biometricEnabled;
  const unavailable = saving || (!enabled && !auth.biometricAvailable);
  async function toggle(value) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true); setError('');
    try { await auth.setBiometricEnabled(value); }
    catch (cause) { setError(cause.message); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <View style={s.section}>
    <View style={s.row}>
      <IconTile><Fingerprint size={24} color={colors.primary} /></IconTile>
      <View style={s.copy}>
        <Text style={s.label}>Entrar com biometria</Text>
        <Text style={s.caption}>{auth.biometricAvailable || enabled
          ? 'Digital ou reconhecimento facial neste aparelho'
          : 'Cadastre uma biometria compatível nas configurações do aparelho'}</Text>
      </View>
      {saving && <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Configurando biometria" />}
      <Switch accessibilityLabel="Entrar com biometria" accessibilityState={{ busy: saving, disabled: unavailable }}
        disabled={unavailable} value={enabled} onValueChange={toggle}
        trackColor={{ false: colors.toggleTrackOff, true: colors.toggleTrackOn }} thumbColor={colors.toggleThumb}
        ios_backgroundColor={colors.toggleTrackOff} />
    </View>
    <InlineNotice message={error} error />
  </View>;
}
const createStyles = colors => StyleSheet.create({
  section: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 86, paddingHorizontal: 6, paddingVertical: 14 },
  copy: { flex: 1, gap: 4 },
  label: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.text },
  caption: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary },
});
