import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { registerUser, loginUser, fetchCurrentUser } from '../services/auth';
import { createAccount } from '../services/accounts';
import { loadSession, storeSession, clearSession } from '../services/sessionStorage';

const OnboardingContext = createContext(null);

// A sessão salva só é liberada depois da validação na API.
export function OnboardingProvider({ children }) {
  const [profile, setProfile] = useState({ name: '' });
  const [accounts, setAccounts] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef(null);

  const reset = useCallback(() => {
    sessionRef.current = null;
    setSession(null); setProfile({ name: '' }); setAccounts([]); setCompleted(false);
    clearSession().catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = await loadSession();
        if (!saved?.accessToken || !saved.expiresAt || saved.expiresAt <= Date.now()) {
          await clearSession();
          return;
        }
        const user = await fetchCurrentUser(saved.accessToken);
        if (active) {
          const restored = { ...saved, user };
          sessionRef.current = restored;
          setSession(restored); setProfile(user);
        }
      } catch { if (active) { reset(); } }
      finally { if (active) { setReady(true); } }
    }
    restore();
    return () => { active = false; };
  }, [reset]);

  useEffect(() => {
    if (!session?.expiresAt) { return; }
    const timeout = setTimeout(reset, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [session, reset]);

  const validateSession = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.expiresAt <= Date.now()) { reset(); return false; }
    try {
      const user = await fetchCurrentUser(current.accessToken);
      if (sessionRef.current !== current) { return false; }
      setProfile(user);
      return true;
    } catch { if (sessionRef.current === current) { reset(); } return false; }
  }, [reset]);

  async function authenticate(action, values) {
    const nextSession = await action(values);
    const user = await fetchCurrentUser(nextSession.accessToken);
    nextSession.user = user;
    nextSession.expiresAt = Date.now() + (Number(nextSession.expiresIn) || 900) * 1000;
    await storeSession(nextSession);
    sessionRef.current = nextSession;
    setSession(nextSession);
    setProfile(nextSession.user);
    setAccounts([]);
    setCompleted(false);
  }
  async function saveAccount(values, id) {
    if (id != null) { throw new Error('A edição estará disponível quando o endpoint de atualização estiver pronto.'); }
    const account = await createAccount(values, session?.accessToken);
    setAccounts(previous => [...previous, account]);
    return account;
  }

  return <OnboardingContext.Provider value={{ profile, accounts, completed, session, ready, validateSession, register: values => authenticate(registerUser, values), login: values => authenticate(loginUser, values), saveAccount, completeSetup: () => setCompleted(true), reset }}>{children}</OnboardingContext.Provider>;
}
export const useOnboarding = () => useContext(OnboardingContext);
