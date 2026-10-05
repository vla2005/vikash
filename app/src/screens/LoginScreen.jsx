import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import InlineNotice from '../components/InlineNotice';
import { useOnboarding } from '../contexts/OnboardingContext';
import useToast from '../hooks/useToast';
import { validateLogin } from '../utils/validation';
import { fontFamilyMedium, colors, fontFamily, typography } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const passwordRef = useRef(null);
  const { login } = useOnboarding();
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
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={typography.title}>Bom ter você de volta.</Text>
        <Text style={typography.body}>Entre para acompanhar suas contas.</Text>
      </View>
      <View style={styles.form}>
        <FormField label="E-mail" placeholder="seu@email.com" value={email} onChangeText={value => { setEmail(value); setErrors(previous => ({ ...previous, email: undefined })); }}
          error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} testID="login-email" />
        <FormField ref={passwordRef} label="Senha" placeholder="Sua senha" password value={password} onChangeText={value => { setPassword(value); setErrors(previous => ({ ...previous, password: undefined })); }}
          error={errors.password} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} testID="login-password" />
      </View>
      <Pressable accessibilityRole="button" onPress={() => setRecoveryVisible(true)} style={styles.forgot} hitSlop={8}><Text style={styles.link}>Esqueci minha senha</Text></Pressable>
      <InlineNotice message={requestError} error />
      <PrimaryButton title="Entrar" onPress={submit} loading={loading} style={styles.submit} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem cadastro?</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')} hitSlop={8}><Text style={styles.link}>Criar cadastro</Text></Pressable>
      </View>
      <Modal visible={recoveryVisible} transparent animationType="fade" onRequestClose={() => setRecoveryVisible(false)}>
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <View style={styles.dialogHeader}><Text style={styles.dialogTitle}>Recuperar acesso</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={12} onPress={() => setRecoveryVisible(false)}><Icon name="close" /></Pressable></View>
            <Text style={typography.body}>A recuperação de senha estará disponível em breve.</Text>
            <PrimaryButton title="Entendi" onPress={() => setRecoveryVisible(false)} icon={false} />
          </View>
        </View>
      </Modal>
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
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backdrop, padding: 24 },
  dialog: { maxWidth: 390, width: '100%', backgroundColor: colors.background, borderRadius: 24, padding: 24, gap: 22 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  dialogTitle: { ...typography.title, fontSize: 23, lineHeight: 28 },
});
