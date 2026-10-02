import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useOnboarding } from '../contexts/OnboardingContext';

export default function ProtectedScreen({ component: Component, active = true, ...props }) {
  const { ready, session, validateSession } = useOnboarding();
  const [verifiedToken, setVerifiedToken] = useState(null);
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
      const valid = await validateSession();
      if (!mounted) { return; }
      if (valid) { setVerifiedToken(token); } else { toLogin(); }
    }
    check();
    const interval = setInterval(check, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { setVerifiedToken(null); check(); }
    });
    return () => { mounted = false; clearInterval(interval); subscription.remove(); };
  }, [ready, token, active, validateSession]);
  if (!ready || !token || token !== verifiedToken || !active) { return null; }
  return <Component {...props} />;
}
