import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import PasswordRecoveryLayout, { useRecoveryStyles } from '../components/PasswordRecoveryLayout';
import PrimaryButton from '../components/PrimaryButton';
import InlineNotice from '../components/InlineNotice';
import { useTheme } from '../contexts/ThemeContext';
import { verifyRegistrationEmail } from '../services/auth';
import { REGISTRATION_LINK_TOKEN_PATTERN } from '../utils/passwordRecovery';

export default function VerifyEmailScreen({ token, onBack }) {
  const s = useRecoveryStyles();
  const { colors } = useTheme();
  const valid = REGISTRATION_LINK_TOKEN_PATTERN.test(token || '');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(valid ? 'verifying' : 'invalid');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!valid || Platform.OS === 'web') return undefined;
    setStatus('verifying'); setError('');
    verifyRegistrationEmail(token).then(() => { if (active) setStatus('success'); }).catch(cause => {
      if (!active) return;
      setStatus(cause.status === 400 ? 'invalid' : 'retry');
      setError(cause.status === 400
        ? 'Este link é inválido, expirou ou já foi usado. Se já confirmou o e-mail, entre com sua senha.'
        : 'Não foi possível confirmar agora. Confira sua conexão e tente novamente.');
    });
    return () => { active = false; };
  }, [token, valid, attempt]);

  if (Platform.OS === 'web') {
    return <PasswordRecoveryLayout title="Continue no aplicativo." description="A confirmação do e-mail acontece dentro do ViKash instalado no Android." onBack={onBack}>
      <View style={s.actions}><PrimaryButton title="Abrir ViKash" icon={null} onPress={async () => {
        try { await Linking.openURL(`vikash://verify-email${valid ? `?token=${token}` : ''}`); }
        catch { setError('Abra o ViKash instalado no aparelho e toque novamente no botão do e-mail.'); }
      }} /><InlineNotice message={error} error /></View>
    </PasswordRecoveryLayout>;
  }
  if (status === 'success') {
    return <PasswordRecoveryLayout title="E-mail confirmado." symbol="success"
      description="Seu cadastro está pronto. Entre com seu e-mail e senha para começar a usar o ViKash." onBack={onBack}>
      <View style={s.actions}><PrimaryButton title="Continuar no ViKash" icon={null} onPress={onBack} /></View>
    </PasswordRecoveryLayout>;
  }
  if (status === 'verifying') {
    return <PasswordRecoveryLayout title="Verificando seu e-mail…" description="Aguarde enquanto confirmamos seu cadastro com segurança." onBack={onBack}>
      <View style={s.actions} accessibilityLiveRegion="polite"><ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Verificando e-mail" /></View>
    </PasswordRecoveryLayout>;
  }
  return <PasswordRecoveryLayout title={status === 'invalid' ? 'Precisamos de um novo link.' : 'Vamos tentar novamente.'}
    description={status === 'invalid' ? 'O link de confirmação pode ter expirado ou já ter sido usado.' : 'Seu cadastro ainda precisa ser confirmado.'} onBack={onBack}>
    <View style={s.actions}>
      <InlineNotice message={error || 'Reabra o link recebido por e-mail ou solicite um novo cadastro.'} error />
      {status === 'retry' && <PrimaryButton title="Tentar novamente" icon={null} onPress={() => setAttempt(value => value + 1)} />}
      <PrimaryButton title="Continuar no ViKash" outlined icon={null} onPress={onBack} />
    </View>
    <View style={s.notice}><Text style={s.text}>Se já confirmou o e-mail, entre com sua senha. Para receber um novo link, volte ao cadastro e repita a solicitação.</Text></View>
  </PasswordRecoveryLayout>;
}
