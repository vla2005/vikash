import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BrandLogo from '../components/BrandLogo';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import InlineNotice from '../components/InlineNotice';
import { useOnboarding } from '../contexts/OnboardingContext';
import useToast from '../hooks/useToast';
import { validateRegistration } from '../utils/validation';
import { fontFamilyMedium, colors, fontFamily, typography } from '../theme';

export default function RegisterScreen({ navigation }) {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const { register } = useOnboarding();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const submitting = useRef(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  function change(key, value) { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); }
  async function submit() {
    if (submitting.current) { return; }
    const next = validateRegistration(values);
    setErrors(next);
    if (Object.keys(next).length) { showToast({ type: 'warn', message: 'Confira os campos destacados para continuar.' }); return; }
    submitting.current = true;
    setLoading(true);
    setRequestError('');
    try {
      await register(values);
      showToast({ type: 'success', title: 'Cadastro realizado!', message: 'Seu acesso está pronto. Agora crie sua primeira conta.' });
      setValues(previous => ({ ...previous, password: '', confirmPassword: '' }));
      navigation.reset({ index: 0, routes: [{ name: 'AddFinancialItem' }] });
    } catch (cause) {
      setRequestError(cause.message);
      showToast({ type: 'error', title: 'Não foi possível cadastrar', message: cause.message });
      setErrors(cause.fieldErrors || {});
    } finally { submitting.current = false; setLoading(false); }
  }
  return <Screen>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Voltar ao login" style={styles.back} onPress={() => navigation.goBack()}><Icon name="back" size={25} color={colors.secondary} /></Pressable><BrandLogo centered /><View style={styles.headerBalance} /></View>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Vamos começar.</Text><Text style={typography.body}>Crie seu acesso ao Vikash.</Text></View>
    <View style={styles.form}>
      <FormField label="Nome" placeholder="Como você se chama?" value={values.name} onChangeText={value => change('name', value)} error={errors.name} maxLength={100} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} testID="register-name" />
      <FormField ref={emailRef} label="E-mail" placeholder="seu@email.com" value={values.email} onChangeText={value => change('email', value)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} testID="register-email" />
      <FormField ref={passwordRef} label="Senha" placeholder="Crie uma senha" password value={values.password} onChangeText={value => change('password', value)} error={errors.password} hint="Use pelo menos 8 caracteres." maxLength={100} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} testID="register-password" />
      <FormField ref={confirmRef} label="Confirmar senha" placeholder="Repita sua senha" password value={values.confirmPassword} onChangeText={value => change('confirmPassword', value)} error={errors.confirmPassword} maxLength={100} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={submit} testID="register-confirm" />
    </View>
    <View style={styles.nextStep}><View style={styles.nextIcon}><Icon name="user" color={colors.primary} size={23} /></View><Text style={styles.nextText}>Depois, você adiciona suas contas.</Text></View>
    <InlineNotice message={requestError} error />
    <PrimaryButton title="Criar cadastro" onPress={submit} loading={loading} style={styles.submit} />
    <View style={styles.footer}><Text style={styles.footerText}>Já tem cadastro?</Text><Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')} hitSlop={8}><Text style={styles.link}>Entrar</Text></Pressable></View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 34, height: 44, justifyContent: 'center' },
  headerBalance: { width: 34 },
  heading: { marginTop: 28, gap: 9 },
  title: { ...typography.title, fontSize: 32, lineHeight: 41 },
  form: { marginTop: 24, gap: 16, padding: 18, backgroundColor: colors.surface, borderRadius: 24 },
  nextStep: { marginTop: 23, padding: 13, borderRadius: 12, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextIcon: { height: 38, width: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  nextText: { flex: 1, color: '#555E73', fontFamily, fontSize: 14, lineHeight: 20 },
  submit: { marginTop: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 4 },
  footerText: { color: colors.secondary, fontFamily, fontSize: 14 },
  link: { color: colors.primary, fontFamily: fontFamilyMedium, fontSize: 14, fontWeight: '500' },
});
