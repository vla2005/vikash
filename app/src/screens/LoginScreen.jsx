import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import ProfileSwitcherDrawer from '../components/ProfileSwitcherDrawer';
import { useOnboarding } from '../contexts/OnboardingContext';
import useToast from '../hooks/useToast';
import { validateLogin } from '../utils/validation';
import { fontFamilyMedium, colors, fontFamily, typography } from '../theme';

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const passwordRef = useRef(null);
  const { login, session, profiles = [], activeProfileId, switchProfile, logout } = useOnboarding();
  const [profilesVisible, setProfilesVisible] = useState(false);
  const adding = route?.params?.addingAccount && !!session;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const submitting = useRef(false);

  async function submit() {
    if (submitting.current) { return; }
    const next = validateLogin({ email, password });
    setErrors(next);
    if (Object.keys(next).length) { showToast({ type: 'warn', message: 'Confira os campos destacados antes de entrar.' }); return; }
    submitting.current = true;
    setLoading(true);
    setRequestError('');
    try {
      await login({ email, password });
      showToast({ type: 'success', title: 'Bem-vindo de volta!', message: 'Login realizado com sucesso.' });
      setPassword('');
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (cause) { setRequestError(cause.message); showToast({ type: 'error', title: 'Não foi possível entrar', message: cause.message }); }
    finally { submitting.current = false; setLoading(false); }
  }

  return (
    <Screen>
      <BrandLogo width={156} />
      {adding && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar adição de conta" disabled={loading}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} style={styles.cancel}><Text style={styles.link}>Voltar para minha conta</Text></Pressable>}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={typography.title}>{adding ? 'Adicionar outra conta.' : 'Bom ter você de volta.'}</Text>
        <Text style={typography.body}>{adding ? 'Entre uma vez. Depois, alterne pelo seu avatar.' : 'Entre para acompanhar suas contas.'}</Text>
      </View>
      <View style={styles.form}>
        <FormField label="E-mail" placeholder="seu@email.com" value={email} onChangeText={value => { setEmail(value); setErrors(previous => ({ ...previous, email: undefined })); }}
          error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} testID="login-email" />
        <FormField ref={passwordRef} label="Senha" placeholder="Sua senha" password value={password} onChangeText={value => { setPassword(value); setErrors(previous => ({ ...previous, password: undefined })); }}
          error={errors.password} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} testID="login-password" />
      </View>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => navigation.navigate('ForgotPassword', { email })} style={styles.forgot} hitSlop={8}><Text style={styles.link}>Esqueci minha senha</Text></Pressable>
      <InlineNotice message={requestError} error />
      <PrimaryButton title="Entrar" onPress={submit} loading={loading} style={styles.submit} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem cadastro?</Text>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => navigation.navigate('Register', { addingAccount: adding })} hitSlop={8}><Text style={styles.link}>Criar cadastro</Text></Pressable>
      </View>
      {!!profiles.length && !adding && <Pressable accessibilityRole="button" accessibilityLabel="Abrir contas salvas" disabled={loading}
        onPress={() => setProfilesVisible(true)} style={styles.saved}><Text style={styles.link}>Usar uma conta salva</Text></Pressable>}
      <ProfileSwitcherDrawer visible={profilesVisible} profiles={profiles} activeProfileId={activeProfileId}
        onClose={() => setProfilesVisible(false)} onLogout={logout}
        onAdd={() => { setEmail(''); setPassword(''); setRequestError(''); }}
        onRequireLogin={profile => { setEmail(profile.email); setPassword(''); setRequestError('Entre novamente nesta conta para continuar.'); }}
        onSelect={async id => { await switchProfile(id); navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 32, gap: 10 },
  form: { marginTop: 28, gap: 18, padding: 20, backgroundColor: colors.surface, borderRadius: 24 },
  forgot: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 12 },
  link: { color: colors.primary, fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '500' },
  submit: { marginTop: 28 },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 7, marginTop: 28 },
  footerText: { color: colors.secondary, fontFamily, fontSize: 14, lineHeight: 20 },
  cancel: { marginTop: 16, paddingVertical: 12, alignSelf: 'flex-start' },
  saved: { alignItems: 'center', minHeight: 48, justifyContent: 'center', marginTop: 16 },
});
