import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import PasswordRecoveryLayout, { recoveryStyles as s } from '../components/PasswordRecoveryLayout';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import useProfileForm from '../hooks/useProfileForm';
import { requestPasswordReset } from '../services/auth';
import { RECOVERY_MESSAGE, validateRecoveryEmail } from '../utils/passwordRecovery';

export default function ForgotPasswordScreen({ navigation, route, initialEmail = '', onBack, backLabel = 'Voltar ao login' }) {
  const back = onBack || (() => navigation.goBack());
  const [sent, setSent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) { return; }
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const form = useProfileForm({
    initialValues: { email: initialEmail || route?.params?.email || '' },
    validate: validateRecoveryEmail, toRequest: values => ({ email: values.email }), onSave: requestPasswordReset,
    onSaved: () => { setSent(true); setSeconds(60); },
    successMessage: RECOVERY_MESSAGE, errorMessage: 'Não foi possível solicitar o link. Tente novamente.',
  });
  if (sent) {
    return <PasswordRecoveryLayout title="Confira seu e-mail." description={RECOVERY_MESSAGE} symbol="email" onBack={back} backLabel={backLabel} saving={form.saving}>
      <View style={s.notice}><Text style={s.text}>O link é válido por 15 minutos. Confira também a pasta de spam.</Text></View>
      <View style={s.actions}>
        <InlineNotice message={form.errors.email || form.requestError} error />
        <PrimaryButton title={backLabel} onPress={back} disabled={form.saving} icon={null} />
        <PrimaryButton title={seconds ? `Reenviar em ${seconds}s` : 'Reenviar link'} onPress={form.submit} outlined loading={form.saving} disabled={seconds > 0} icon={null} />
        <PrimaryButton title="Usar outro e-mail" onPress={() => setSent(false)} outlined disabled={form.saving} icon={null} />
      </View>
    </PasswordRecoveryLayout>;
  }
  return <PasswordRecoveryLayout title="Recupere seu acesso." description="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha." onBack={back} backLabel={backLabel} saving={form.saving}>
    <View style={s.form}><FormField label="E-mail" placeholder="seu@email.com" value={form.values.email} onChangeText={value => form.change('email', value)}
      error={form.errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
      maxLength={150} editable={!form.saving} returnKeyType="send" onSubmitEditing={form.submit} testID="recovery-email" />
      <InlineNotice message={form.requestError} error />
      <PrimaryButton title="Enviar link de recuperação" onPress={form.submit} loading={form.saving} icon={null} /></View>
  </PasswordRecoveryLayout>;
}
