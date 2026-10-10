import React, { useRef, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import PasswordRecoveryLayout, { recoveryStyles as s } from '../components/PasswordRecoveryLayout';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import useProfileForm from '../hooks/useProfileForm';
import useToast from '../hooks/useToast';
import { resetPassword } from '../services/auth';
import { clearSession } from '../services/sessionStorage';
import { PASSWORD_HINT } from '../utils/passwordValidation';
import { RESET_TOKEN_PATTERN, validatePasswordReset } from '../utils/passwordRecovery';

export default function ResetPasswordScreen({ token, onBack, onRequestLink }) {
  const [complete, setComplete] = useState(false);
  const confirmRef = useRef(null);
  const { showToast } = useToast();
  const form = useProfileForm({
    initialValues: { token: token || '', newPassword: '', confirmPassword: '' },
    validate: validatePasswordReset, toRequest: values => ({ token: values.token, newPassword: values.newPassword }),
    onSave: async values => {
      await resetPassword(values);
      // A API já encerrou as sessões. Uma falha no armazenamento não desfaz o reset.
      await clearSession().catch(() => {});
    },
    onSaved: () => { form.change('token', ''); form.change('newPassword', ''); form.change('confirmPassword', ''); setComplete(true); },
    successMessage: 'Senha redefinida. Entre novamente com sua nova senha.',
  });
  async function openApp() {
    try { await Linking.openURL('vikash://login'); }
    catch { showToast({ type: 'info', message: 'Abra o Vikash instalado no celular e entre com sua nova senha.' }); }
  }
  if (complete) {
    return <PasswordRecoveryLayout title="Senha redefinida." description="Seu acesso está protegido. Todas as sessões anteriores foram encerradas." symbol="success" onBack={onBack}>
      <View style={s.actions}>
        {Platform.OS === 'web' && <PrimaryButton title="Abrir Vikash" onPress={openApp} icon={null} />}
        <PrimaryButton title="Ir para o login" onPress={onBack} outlined={Platform.OS === 'web'} icon={null} />
      </View>
      <View style={s.notice}><Text style={s.text}>{Platform.OS === 'web'
        ? 'Se o aplicativo não abrir, abra o Vikash no celular e entre com sua nova senha.'
        : 'Use sua nova senha para entrar novamente.'}</Text></View>
    </PasswordRecoveryLayout>;
  }
  const linkError = form.errors.token || (!RESET_TOKEN_PATTERN.test(token || '') && 'Reabra o link recebido por e-mail ou solicite um novo.');
  if (linkError) {
    return <PasswordRecoveryLayout title="Precisamos de um novo link." description="O link de recuperação está incompleto, expirou ou já foi utilizado." symbol="password" onBack={onBack}>
      <View style={s.actions}><InlineNotice message={linkError} error />
        <PrimaryButton title="Solicitar novo link" onPress={onRequestLink} icon={null} />
        <PrimaryButton title="Ir para o login" onPress={onBack} outlined icon={null} /></View>
    </PasswordRecoveryLayout>;
  }
  return <PasswordRecoveryLayout title="Crie sua nova senha." description="Escolha uma senha para voltar a acessar sua conta." symbol="password" onBack={onBack} saving={form.saving}>
    <View style={s.form}>
      <FormField label="Nova senha" password placeholder="Crie sua nova senha" value={form.values.newPassword} onChangeText={value => form.change('newPassword', value)}
        error={form.errors.newPassword} hint={PASSWORD_HINT} maxLength={72} editable={!form.saving} autoCapitalize="none" autoCorrect={false}
        autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} testID="reset-new-password" />
      <FormField ref={confirmRef} label="Confirmar nova senha" password placeholder="Repita sua nova senha" value={form.values.confirmPassword} onChangeText={value => form.change('confirmPassword', value)}
        error={form.errors.confirmPassword} maxLength={72} editable={!form.saving} autoCapitalize="none" autoCorrect={false}
        autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={form.submit} testID="reset-confirm-password" />
      <InlineNotice message={form.requestError} error />
      <PrimaryButton title="Redefinir senha" onPress={form.submit} loading={form.saving} icon={null} />
    </View>
    <View style={s.notice}><Text style={s.text}>Após salvar, você precisará entrar novamente nos seus dispositivos.</Text></View>
  </PasswordRecoveryLayout>;
}
