/* eslint-env browser */
import { useEffect, useState } from 'react';
import { parseRecoveryLink } from '../utils/passwordRecovery';

export default function useRecoveryLink() {
  const [route, setRoute] = useState(() => parseRecoveryLink(window.location.href));
  useEffect(() => {
    const changed = () => setRoute(parseRecoveryLink(window.location.href));
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  useEffect(() => {
    if (route?.kind === 'reset') {
      // Mantém o token somente em memória, sem deixá-lo no histórico do navegador.
      window.history.replaceState(null, '', '/reset-password');
    }
  }, [route]);
  function navigate(kind, path) {
    window.history.replaceState(null, '', path);
    setRoute({ kind });
  }
  return { ready: true, route, openForgot: () => navigate('forgot', '/forgot-password'), exit: () => navigate('login', '/login') };
}
