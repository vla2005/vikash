import React, { useEffect, useRef } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';

export default function ProtectedScreen({ component: Component, active = true, ...props }) {
  const { ready, session } = useOnboarding();
  const navigationRef = useRef(props.navigation);
  navigationRef.current = props.navigation;
  const token = session?.accessToken;
  useEffect(() => {
    if (!ready || !active) { return; }
    if (!token) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [ready, token, active]);
  // O provider só disponibiliza a sessão após validar a autenticação inicial.
  if (!ready || !token || !active) { return null; }
  return <Component {...props} />;
}
