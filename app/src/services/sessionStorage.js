import { readValue, writeValue, removeValue } from './secureStorage';
import { sessionProfileId } from '../utils/sessionProfile';
import { openBiometricSession, sealBiometricSession, createBiometricSession, unlockBiometricKey, removeBiometricKey } from './biometricSession';

const legacyKey = 'vikash.session';
const indexKey = 'vikash.profiles';
let writes = Promise.resolve();
// Uma chave por perfil evita colocar todos os tokens em um único item do SecureStore.
const profileKey = id => `vikash.profile.${Array.from(id).map(char => char.charCodeAt(0).toString(16)).join('-')}`;
const readJson = async key => { const value = await readValue(key); return value ? JSON.parse(value) : null; };
const readIndex = async () => (await readJson(indexKey)) || { ids: [], activeId: null };
function serializeWrite(action) {
  const pending = writes.then(action);
  writes = pending.catch(() => {});
  return pending;
}
const payload = session => ({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt,
  user: { uuid: session.user.uuid, name: session.user.name, email: session.user.email } });

export async function loadSession() {
  await writes;
  const index = await readIndex();
  if (index.activeId) { return openBiometricSession(await readJson(profileKey(index.activeId))); }
  return readJson(legacyKey);
}
export async function loadProfileSessions() {
  await writes;
  const index = await readIndex();
  const sessions = await Promise.all(index.ids.map(async id => openBiometricSession(await readJson(profileKey(id)))));
  return sessions.filter(session => sessionProfileId(session));
}
export async function unlockProfileSession(id) {
  await writes;
  const record = await readJson(profileKey(id));
  if (record?.biometric) { await unlockBiometricKey(id); }
  return openBiometricSession(record);
}
export function storeSession(session, { activate = true, passwordLogin = false } = {}) {
  return serializeWrite(async () => {
    const tokens = { accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt };
    const id = sessionProfileId(session);
    if (!id) { await writeValue(legacyKey, JSON.stringify(tokens)); return; }
    const index = await readIndex();
    const previous = await readJson(profileKey(id));
    const data = payload(session);
    // Uma nova autenticação por senha substitui uma chave inacessível, sem liberar o envelope antigo.
    const record = previous?.biometric && !passwordLogin ? await sealBiometricSession(id, data) : data;
    await writeValue(profileKey(id), JSON.stringify(record));
    if (previous?.biometric && passwordLogin) { await removeBiometricKey(id).catch(() => {}); }
    if (!index.ids.includes(id)) { index.ids.push(id); }
    if (activate) { index.activeId = id; }
    await writeValue(indexKey, JSON.stringify(index));
    await removeValue(legacyKey);
  });
}
export function enableProfileBiometrics(id) {
  return serializeWrite(async () => {
    const session = await openBiometricSession(await readJson(profileKey(id)));
    if (!session?.refreshToken) { throw new Error('Entre com sua senha antes de ativar a biometria.'); }
    if (session.biometricEnabled) { return; }
    try {
      const record = await createBiometricSession(id, payload(session));
      await writeValue(profileKey(id), JSON.stringify(record));
    } catch (cause) {
      await removeBiometricKey(id).catch(() => {});
      throw cause;
    }
  });
}
export function disableProfileBiometrics(id) {
  return serializeWrite(async () => {
    const record = await readJson(profileKey(id));
    if (!record?.biometric) { return; }
    let session = await openBiometricSession(record);
    if (session.biometricLocked) { await unlockBiometricKey(id); session = await openBiometricSession(record); }
    await writeValue(profileKey(id), JSON.stringify(payload(session)));
    await removeBiometricKey(id).catch(() => {});
  });
}
export async function biometricPromptSeen(id) {
  return !!(await readJson('vikash.biometric.prompts'))?.includes(id);
}
export function markBiometricPromptSeen(id) {
  return serializeWrite(async () => {
    const seen = (await readJson('vikash.biometric.prompts')) || [];
    if (!seen.includes(id)) { await writeValue('vikash.biometric.prompts', JSON.stringify([...seen, id])); }
  });
}
export function expireProfileSession(id) {
  return serializeWrite(async () => {
    const index = await readIndex();
    const saved = await readJson(profileKey(id));
    if (saved?.user) { await writeValue(profileKey(id), JSON.stringify({ user: saved.user })); }
    if (saved?.biometric) { await removeBiometricKey(id).catch(() => {}); }
    if (index.activeId === id) { index.activeId = null; }
    await writeValue(indexKey, JSON.stringify(index));
  });
}
export function removeProfileSession(id) {
  return serializeWrite(async () => {
    const index = await readIndex();
    const saved = await readJson(profileKey(id));
    index.ids = index.ids.filter(value => value !== id);
    if (index.activeId === id) { index.activeId = null; }
    await writeValue(indexKey, JSON.stringify(index));
    await removeValue(profileKey(id));
    if (saved?.biometric) { await removeBiometricKey(id).catch(() => {}); }
  });
}
export function clearSession() {
  return serializeWrite(async () => {
    const index = await readIndex();
    if (index.activeId) {
      const saved = await readJson(profileKey(index.activeId));
      if (saved?.user) { await writeValue(profileKey(index.activeId), JSON.stringify({ user: saved.user })); }
      if (saved?.biometric) { await removeBiometricKey(index.activeId).catch(() => {}); }
      index.activeId = null;
      await writeValue(indexKey, JSON.stringify(index));
    }
    await removeValue(legacyKey);
  });
}
