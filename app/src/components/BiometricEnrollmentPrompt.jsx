import React, { useState } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import ConfirmationDialog from './ConfirmationDialog';

export default function BiometricEnrollmentPrompt() {
  const { biometricOffer, setBiometricEnabled, dismissBiometricOffer } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function enable() {
    if (loading) return;
    setLoading(true); setError('');
    try { await setBiometricEnabled(true); }
    catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  return <ConfirmationDialog visible={!!biometricOffer} title="Entrar com biometria?"
    message="Use a digital ou o reconhecimento facial do aparelho para entrar nesta conta. Você pode mudar essa opção em Meu perfil."
    confirmText="Ativar biometria" cancelText="Agora não" loading={loading} error={error}
    onConfirm={enable} onCancel={() => { setError(''); void dismissBiometricOffer().catch(() => {}); }} />;
}
