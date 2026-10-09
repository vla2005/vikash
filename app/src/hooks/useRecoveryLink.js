import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { parseRecoveryLink } from '../utils/passwordRecovery';

export default function useRecoveryLink() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState(null);
  useEffect(() => {
    let active = true;
    let received = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const next = parseRecoveryLink(url);
      if (next) { received = true; setRoute(next); setReady(true); }
    });
    Linking.getInitialURL().then(url => {
      if (active && !received) { setRoute(parseRecoveryLink(url)); }
    }).catch(() => {}).finally(() => { if (active) { setReady(true); } });
    return () => { active = false; subscription.remove(); };
  }, []);
  return { ready, route, openForgot: () => setRoute({ kind: 'forgot' }), exit: () => setRoute({ kind: 'login' }) };
}
