import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getSharedOnboarding, publishOnboarding, subscribeOnboarding } from '../services/onboardingBridge';
import { Platform } from 'react-native';
import { registerUser, confirmRegistration, loginUser, fetchCurrentUser, refreshSession, logoutUser } from '../services/auth';
import { ApiError, configureAuth, cancelAuthenticatedRequests } from '../services/apiClient';
import { createAccount, fetchAccounts, updateAccount } from '../services/accounts';
import { updatePassword, updateUser } from '../services/users';
import { loadSession, storeSession, clearSession, loadProfileSessions, expireProfileSession, removeProfileSession, unlockProfileSession, enableProfileBiometrics, disableProfileBiometrics, biometricPromptSeen, markBiometricPromptSeen } from '../services/sessionStorage';
import { biometricCapability, lockBiometricSessions } from '../services/biometricSession';
import { profileSummary, sessionProfileId } from '../utils/sessionProfile';

const OnboardingContext = createContext(null);

// A sessão salva só é liberada depois da validação na API.
export function OnboardingProvider({ children }) {
  if (Platform.OS !== 'android') return <OwnedOnboardingProvider>{children}</OwnedOnboardingProvider>;
  return <AndroidOnboardingProvider>{children}</AndroidOnboardingProvider>;
}
const noOnboardingSubscription = () => () => {};
const emptyOnboarding = () => null;
function AndroidOnboardingProvider({ children }) {
  const [owner, setOwner] = useState(() => !getSharedOnboarding());
  const value = useSyncExternalStore(owner ? noOnboardingSubscription : subscribeOnboarding,
    owner ? emptyOnboarding : getSharedOnboarding, emptyOnboarding);
  useEffect(() => { if (!owner && !value) setOwner(true); }, [owner, value]);
  if (!owner && !value) return null;
  return owner ? <OwnedOnboardingProvider>{children}</OwnedOnboardingProvider>
    : <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
function OwnedOnboardingProvider({ children }) {
  const [profile, setProfile] = useState({ name: '' });
  const [accounts, setAccounts] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOffer, setBiometricOffer] = useState(null);
  const [preferredBiometricProfileId, setPreferredBiometricProfileId] = useState(null);
  useEffect(() => {
    let active = true;
    biometricCapability().then(value => { if (active) setBiometricAvailable(value.available); });
    return () => { active = false; };
  }, []);
  // Troca de usuário reinicia as telas; renovar o token do mesmo usuário não.
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [sessionStartRoute, setSessionStartRoute] = useState('Home');
  const savedProfiles = useRef([]);
  const activeTokens = useRef(new Set());
  const profileAction = useRef(false);
  const sessionRef = useRef(null);
  const renewal = useRef(null);
  const biometricChange = useRef(null);
  const generation = useRef(0);

  const rememberProfile = useCallback(next => {
    const id = sessionProfileId(next);
    if (!id) { return; }
    const previous = savedProfiles.current.find(item => sessionProfileId(item) === id);
    next = { ...next, biometricEnabled: next.biometricEnabled ?? previous?.biometricEnabled };
    const exists = !!previous;
    savedProfiles.current = exists
      ? savedProfiles.current.map(item => sessionProfileId(item) === id ? next : item)
      : [...savedProfiles.current, next];
    setProfiles(savedProfiles.current.map(profileSummary));
  }, []);

  const endSession = useCallback(() => {
    generation.current += 1;
    lockBiometricSessions();
    setBiometricOffer(null);
    cancelAuthenticatedRequests();
    activeTokens.current.clear();
    renewal.current = null;
    sessionRef.current = null;
    setRestoreError('');
    setSession(null); setProfile({ name: '' }); setAccounts([]); setCompleted(false);
    setSessionEpoch(value => value + 1);
  }, []);

  const reset = useCallback(() => {
    const current = sessionRef.current;
    if (current?.user) { rememberProfile({ user: current.user, biometricEnabled: false }); }
    endSession();
    clearSession().catch(() => {});
  }, [endSession, rememberProfile]);

  function activateSession(next, startRoute = 'Home') {
    generation.current += 1;
    cancelAuthenticatedRequests();
    activeTokens.current = new Set([next.accessToken]);
    sessionRef.current = next;
    renewal.current = null;
    setRestoreError('');
    setSession(next); setProfile(next.user); setAccounts([]); setCompleted(false);
    setSessionEpoch(value => value + 1);
    setSessionStartRoute(startRoute);
    rememberProfile(next);
  }

  const resolveToken = useCallback(async (usedToken, force) => {
    if (biometricChange.current) { await biometricChange.current.catch(() => {}); }
    const current = sessionRef.current;
    // Tokens antigos só podem ser renovados dentro do mesmo perfil ativo.
    if (!current || !activeTokens.current.has(usedToken)) {
      throw new ApiError('O perfil ativo mudou. Abra a tela novamente.', 401);
    }
    if (force === 'invalidate') {
      if (current?.accessToken === usedToken) { reset(); }
      throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
    }
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
        next.biometricEnabled = current.biometricEnabled;
        sessionRef.current = next;
        activeTokens.current.add(next.accessToken);
        await storeSession(next);
        if (version !== generation.current) { throw new ApiError('A sessão foi encerrada.', 401); }
        setSession(next); setProfile(next.user);
        rememberProfile(next);
        return next.accessToken;
      } catch (cause) {
        if (version === generation.current && [401, 403].includes(cause.status)) { reset(); }
        throw cause;
      }
    })();
    renewal.current = pending;
    try { return await pending; }
    finally { if (renewal.current === pending) { renewal.current = null; } }
  }, [reset, rememberProfile]);

  useEffect(() => {
    const disconnect = configureAuth(resolveToken);
    return () => { disconnect(); generation.current += 1; cancelAuthenticatedRequests(); };
  }, [resolveToken]);

  useEffect(() => {
    let active = true;
    setReady(false); setRestoreError('');
    async function restore() {
      try {
        const allProfiles = await loadProfileSessions();
        if (!active) { return; }
        savedProfiles.current = allProfiles;
        setProfiles(allProfiles.map(profileSummary));
        const saved = await loadSession();
        if (!active) { return; }
        if (saved?.biometricLocked) {
          setPreferredBiometricProfileId(sessionProfileId(saved));
          return;
        }
        if (!saved?.accessToken || !saved.expiresAt || (saved.expiresAt <= Date.now() && !saved.refreshToken)) {
          if (saved?.user) { rememberProfile({ user: saved.user }); }
          await clearSession();
          return;
        }
        sessionRef.current = saved;
        activeTokens.current = new Set([saved.accessToken]);
        const user = await fetchCurrentUser(saved.accessToken);
        if (active) {
          const restored = { ...sessionRef.current, user };
          // Migra a sessão antiga sem pedir login novamente.
          if (!saved.user) { await storeSession(restored); }
          if (!active) { return; }
          sessionRef.current = restored;
          setSession(restored); setProfile(user);
          rememberProfile(restored);
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
  }, [reset, restoreAttempt, rememberProfile]);

  async function authenticate(action, values) {
    if (profileAction.current) { throw new Error('Aguarde a troca de conta terminar.'); }
    profileAction.current = true;
    try {
      if (renewal.current) { await renewal.current; }
      const version = generation.current;
      const next = await action(values);
      next.user = await fetchCurrentUser(next.accessToken, false);
      next.expiresAt = Date.now() + (Number(next.expiresIn) || 900) * 1000;
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente entrar novamente.', 401); }
      if (renewal.current) { await renewal.current; }
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente entrar novamente.', 401); }
      await storeSession(next, { passwordLogin: true });
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente entrar novamente.', 401); }
      next.biometricEnabled = false;
      activateSession(next, action === confirmRegistration ? 'AddFinancialItem' : 'Home');
      const id = sessionProfileId(next);
      const currentVersion = generation.current;
      try {
        const capability = await biometricCapability();
        setBiometricAvailable(capability.available);
        if (capability.available && id && next.refreshToken && !(await biometricPromptSeen(id))
            && currentVersion === generation.current) { setBiometricOffer(id); }
      } catch { /* A indisponibilidade da biometria não impede um login válido. */ }
    } finally { profileAction.current = false; }
  }

  async function validateProfile(saved) {
    const version = generation.current;
    const ensureCurrent = () => {
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
    };
    if (!saved?.accessToken) { throw new ApiError('Entre novamente nesta conta para continuar.', 401); }
    let next = saved;
    async function renewSaved() {
      if (!next.refreshToken) { throw new ApiError('Entre novamente nesta conta para continuar.', 401); }
      const rotated = await refreshSession(next.refreshToken);
      ensureCurrent();
      if (sessionProfileId(rotated) !== sessionProfileId(saved)) {
        throw new ApiError('Não foi possível validar este perfil. Entre novamente.', 401);
      }
      next = rotated;
      // Persistimos a rotação mesmo se a consulta de perfil falhar depois.
      await storeSession(next, { activate: false });
      ensureCurrent();
      rememberProfile(next);
    }
    if (!(next.expiresAt > Date.now() + 30000)) { await renewSaved(); }
    let user;
    try { user = await fetchCurrentUser(next.accessToken, false); }
    catch (cause) {
      if (cause.status !== 401 || next !== saved) { throw cause; }
      await renewSaved();
      user = await fetchCurrentUser(next.accessToken, false);
    }
    ensureCurrent();
    if (sessionProfileId({ user }) !== sessionProfileId(saved)) {
      throw new ApiError('Não foi possível validar este perfil. Entre novamente.', 401);
    }
    return { ...next, user, biometricEnabled: saved.biometricEnabled };
  }

  async function switchProfile(id) {
    if (id === sessionProfileId(sessionRef.current)) { return; }
    if (profileAction.current) { throw new Error('Aguarde a troca de conta terminar.'); }
    profileAction.current = true;
    try {
      if (renewal.current) { await renewal.current; }
      const version = generation.current;
      let saved = savedProfiles.current.find(item => sessionProfileId(item) === id);
      if (saved?.biometricEnabled) { saved = await unlockProfileSession(id); }
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
      const next = await validateProfile(saved);
      if (renewal.current) { await renewal.current; }
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
      await storeSession(next);
      activateSession(next);
    } catch (cause) {
      if ([401, 403].includes(cause.status) || cause.invalidated) {
        const saved = savedProfiles.current.find(item => sessionProfileId(item) === id);
        if (saved) { await expireProfileSession(id); rememberProfile({ user: saved.user, biometricEnabled: false }); }
      }
      throw cause;
    } finally { profileAction.current = false; }
  }
  async function saveAccount(values, uuid) {
    const version = generation.current;
    const ensureCurrent = () => {
      if (version !== generation.current) { throw new ApiError('O perfil ativo mudou. Abra a tela novamente.', 401); }
    };
    if (uuid != null) {
      const account = await updateAccount(uuid, values, session?.accessToken);
      ensureCurrent();
      if (account) { setAccounts(previous => previous.map(item => item.uuid === uuid ? account : item)); }
      else { const updated = await fetchAccounts(sessionRef.current?.accessToken); ensureCurrent(); setAccounts(updated); }
      return account;
    }
    const account = await createAccount(values, session?.accessToken);
    ensureCurrent();
    setAccounts(previous => [...previous, account]);
    return account;
  }

  async function updateProfile(values) {
    const version = generation.current;
    const user = await updateUser(values, sessionRef.current?.accessToken);
    if (version !== generation.current || !sessionRef.current) {
      throw new ApiError('A sessão foi encerrada. Entre novamente.', 401);
    }
    const updated = { ...sessionRef.current, user };
    await storeSession(updated, { activate: false });
    if (version !== generation.current) { throw new ApiError('O perfil ativo mudou.', 401); }
    sessionRef.current = updated;
    setSession(updated); setProfile(user);
    rememberProfile(updated);
    return user;
  }

  async function logout(id = sessionProfileId(sessionRef.current)) {
    if (profileAction.current) { throw new Error('Aguarde a troca de conta terminar.'); }
    profileAction.current = true;
    try {
      const activeId = sessionProfileId(sessionRef.current);
      if (id && id !== activeId) {
        const saved = savedProfiles.current.find(item => sessionProfileId(item) === id);
        let validated;
        try {
          const credentials = saved?.biometricEnabled ? await unlockProfileSession(id) : saved;
          if (credentials?.accessToken) { validated = await validateProfile(credentials); }
        } catch (cause) {
          // Uma sessão já expirada pode ser removida localmente; falhas de rede não.
          if (![401, 403].includes(cause.status) && !cause.invalidated) { throw cause; }
        }
        if (validated) { await logoutUser(validated.refreshToken, validated.accessToken); }
        await forgetProfile(id);
        return;
      }
      const current = sessionRef.current;
      if (current && await renewForLogout(false)) {
        const revoke = () => logoutUser(sessionRef.current?.refreshToken, sessionRef.current?.accessToken);
        try { await revoke(); }
        catch (cause) {
          if (cause.status !== 401) { throw cause; }
          if (await renewForLogout(true)) { await revoke(); }
        }
      }
      if (id) { await forgetProfile(id); }
      await clearSession();
      endSession();
    } finally { profileAction.current = false; }
  }

  async function renewForLogout(force) {
    try { await resolveToken(sessionRef.current?.accessToken, force); return true; }
    catch (cause) {
      if ([401, 403].includes(cause.status)) { return false; }
      throw cause;
    }
  }

  async function forgetProfile(id) {
    await removeProfileSession(id);
    savedProfiles.current = savedProfiles.current.filter(item => sessionProfileId(item) !== id);
    setProfiles(savedProfiles.current.map(profileSummary));
  }

  async function changePassword(values) {
    const version = generation.current;
    await updatePassword(values, sessionRef.current?.accessToken);
    if (version !== generation.current) {
      throw new ApiError('A sessão foi encerrada. Entre novamente.', 401);
    }
    reset();
  }

  async function loginWithBiometrics(id) {
    if (profileAction.current) { throw new Error('Aguarde a autenticação terminar.'); }
    profileAction.current = true;
    const version = generation.current;
    try {
      const saved = await unlockProfileSession(id);
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
      if (sessionProfileId(saved) !== id) { throw new Error('Não foi possível validar esta conta. Entre com sua senha.'); }
      if (!saved?.biometricEnabled || saved.biometricLocked) { throw new Error('Entre com sua senha para ativar a biometria.'); }
      const next = await validateProfile(saved);
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
      await storeSession(next);
      if (version !== generation.current) { throw new ApiError('A sessão mudou. Tente novamente.', 401); }
      activateSession(next);
    } catch (cause) {
      if (version === generation.current && ([401, 403].includes(cause.status) || cause.invalidated)) {
        const saved = savedProfiles.current.find(item => sessionProfileId(item) === id);
        await expireProfileSession(id);
        if (saved) { rememberProfile({ user: saved.user, biometricEnabled: false }); }
      }
      throw cause;
    } finally { profileAction.current = false; }
  }

  async function setBiometricEnabled(enabled) {
    if (profileAction.current) { throw new Error('Aguarde a autenticação terminar.'); }
    profileAction.current = true;
    const version = generation.current;
    const pending = (async () => {
      if (renewal.current) { await renewal.current; }
      if (version !== generation.current) { throw new Error('A sessão mudou. Tente novamente.'); }
      const current = sessionRef.current;
      const id = sessionProfileId(current);
      if (!id || !current?.refreshToken) { throw new Error('Entre com sua senha antes de configurar a biometria.'); }
      if (enabled) { await enableProfileBiometrics(id); }
      else { await disableProfileBiometrics(id); }
      if (version !== generation.current) { throw new Error('A sessão mudou. Tente novamente.'); }
      const updated = { ...sessionRef.current, biometricEnabled: enabled };
      sessionRef.current = updated; setSession(updated); rememberProfile(updated);
      await markBiometricPromptSeen(id).catch(() => {});
      if (version === generation.current) { setBiometricOffer(null); }
    })();
    biometricChange.current = pending;
    try { await pending; }
    finally {
      if (biometricChange.current === pending) { biometricChange.current = null; }
      profileAction.current = false;
    }
  }
  async function dismissBiometricOffer() {
    const id = biometricOffer;
    setBiometricOffer(null);
    if (id) { await markBiometricPromptSeen(id); }
  }

  const sharedValue = { biometricAvailable, biometricOffer: !!biometricOffer && biometricOffer === sessionProfileId(session), preferredBiometricProfileId, loginWithBiometrics, setBiometricEnabled, dismissBiometricOffer, profile, profiles, activeProfileId: sessionProfileId(session), sessionEpoch, sessionStartRoute, switchProfile, accounts, completed, session, ready, restoreError, retryRestore: () => setRestoreAttempt(value => value + 1), register: registerUser, confirmRegistration: values => authenticate(confirmRegistration, values), login: values => authenticate(loginUser, values), saveAccount, updateProfile, changePassword, completeSetup: () => setCompleted(true), logout, reset };
  useLayoutEffect(() => { if (Platform.OS === 'android') publishOnboarding(sharedValue); });
  useLayoutEffect(() => () => { if (Platform.OS === 'android') publishOnboarding(null); }, []);
  return <OnboardingContext.Provider value={sharedValue}>{children}</OnboardingContext.Provider>;
}
export const useOnboarding = () => useContext(OnboardingContext);
