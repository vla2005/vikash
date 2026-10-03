import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { registerUser, loginUser, fetchCurrentUser, refreshSession } from '../services/auth';
import { ApiError, configureAuth } from '../services/apiClient';
import { createAccount, fetchAccounts, updateAccount } from '../services/accounts';
import { loadSession, storeSession, clearSession } from '../services/sessionStorage';

const OnboardingContext = createContext(null);

// A sessão salva só é liberada depois da validação na API.
export function OnboardingProvider({ children }) {
  const [profile, setProfile] = useState({ name: '' });
  const [accounts, setAccounts] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const sessionRef = useRef(null);
  const renewal = useRef(null);
  const generation = useRef(0);

  const reset = useCallback(() => {
    generation.current += 1;
    renewal.current = null;
    sessionRef.current = null;
    setRestoreError('');
    setSession(null); setProfile({ name: '' }); setAccounts([]); setCompleted(false);
    clearSession().catch(() => {});
  }, []);

  const resolveToken = useCallback(async (usedToken, force) => {
    const current = sessionRef.current;
    if (force === 'invalidate') {
      if (current?.accessToken === usedToken) { reset(); }
      throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
    }
    if (!current) { throw new ApiError('Sua sessão expirou. Entre novamente.', 401); }
    if (renewal.current) { return renewal.current; }
    if ((force && current.accessToken !== usedToken) || (!force && current.expiresAt > Date.now() + 30000)) {
      return current.accessToken;
    }
    if (!current.refreshToken) {
      reset();
      throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
    }
    const version = generation.current;
    const pending = (async () => {
      try {
        const next = await refreshSession(current.refreshToken);
        if (version !== generation.current) { throw new ApiError('A sessão foi encerrada.', 401); }
        // Guardamos o token rotacionado antes de liberar as requisições em espera.
        sessionRef.current = next;
        await storeSession(next);
        if (version !== generation.current) { throw new ApiError('A sessão foi encerrada.', 401); }
        setSession(next); setProfile(next.user);
        return next.accessToken;
      } catch (cause) {
        if (version === generation.current && [401, 403].includes(cause.status)) { reset(); }
        throw cause;
      }
    })();
    renewal.current = pending;
    try { return await pending; }
    finally { if (renewal.current === pending) { renewal.current = null; } }
  }, [reset]);

  useEffect(() => {
    const disconnect = configureAuth(resolveToken);
    return () => { disconnect(); generation.current += 1; };
  }, [resolveToken]);

  useEffect(() => {
    let active = true;
    setReady(false); setRestoreError('');
    async function restore() {
      try {
        const saved = await loadSession();
        if (!active) { return; }
        if (!saved?.accessToken || !saved.expiresAt || (saved.expiresAt <= Date.now() && !saved.refreshToken)) {
          await clearSession();
          return;
        }
        sessionRef.current = saved;
        const user = await fetchCurrentUser(saved.accessToken);
        if (active) {
          const restored = { ...sessionRef.current, user };
          sessionRef.current = restored;
          setSession(restored); setProfile(user);
        }
      } catch (cause) {
        if (active) {
          if ([401, 403].includes(cause.status)) { reset(); }
          else { setRestoreError('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.'); }
        }
      }
      finally { if (active) { setReady(true); } }
    }
    restore();
    return () => { active = false; };
  }, [reset, restoreAttempt]);

  async function authenticate(action, values) {
    const nextSession = await action(values);
    const user = await fetchCurrentUser(nextSession.accessToken, false);
    nextSession.user = user;
    nextSession.expiresAt = Date.now() + (Number(nextSession.expiresIn) || 900) * 1000;
    await storeSession(nextSession);
    generation.current += 1;
    setRestoreError('');
    sessionRef.current = nextSession;
    setSession(nextSession);
    setProfile(nextSession.user);
    setAccounts([]);
    setCompleted(false);
  }
  async function saveAccount(values, uuid) {
    if (uuid != null) {
      const account = await updateAccount(uuid, values, session?.accessToken);
      if (account) { setAccounts(previous => previous.map(item => item.uuid === uuid ? account : item)); }
      else { setAccounts(await fetchAccounts(sessionRef.current?.accessToken)); }
      return account;
    }
    const account = await createAccount(values, session?.accessToken);
    setAccounts(previous => [...previous, account]);
    return account;
  }

  return <OnboardingContext.Provider value={{ profile, accounts, completed, session, ready, restoreError, retryRestore: () => setRestoreAttempt(value => value + 1), register: values => authenticate(registerUser, values), login: values => authenticate(loginUser, values), saveAccount, completeSetup: () => setCompleted(true), reset }}>{children}</OnboardingContext.Provider>;
}
export const useOnboarding = () => useContext(OnboardingContext);
