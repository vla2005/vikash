import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useOnboarding } from '../contexts/OnboardingContext';
import SessionRetry from '../components/SessionRetry';

export default function ProtectedScreen({ component: Component, active = true, ...props }) {
  const { ready, session, validateSession } = useOnboarding();
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const navigationRef = useRef(props.navigation);
  navigationRef.current = props.navigation;
  const token = session?.accessToken;
  useEffect(() => {
    if (!ready || !active) { return; }
    let mounted = true;
    function toLogin() {
      if (mounted) { setVerifiedToken(null); navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] }); }
    }
    if (!token) { toLogin(); return; }
    async function check() {
      try {
        const valid = await validateSession();
        if (!mounted) { return; }
        setError('');
        if (valid) { setVerifiedToken(token); } else { toLogin(); }
      } catch {
        if (mounted) { setError('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.'); }
      }
    }
    check();
    const interval = setInterval(check, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { check(); }
    });
    return () => { mounted = false; clearInterval(interval); subscription.remove(); };
  }, [ready, token, active, validateSession, attempt]);
  if (error && ready && token && active) { return <SessionRetry message={error} onRetry={() => setAttempt(value => value + 1)} />; }
  if (!ready || !token || !verifiedToken || !active) { return null; }
  return <Component {...props} />;
}
