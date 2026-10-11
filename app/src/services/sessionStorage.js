import { readValue, writeValue, removeValue } from './secureStorage';
import { sessionProfileId } from '../utils/sessionProfile';

const legacyKey = 'vikash.session';
const indexKey = 'vikash.profiles';
let writes = Promise.resolve();

// Uma chave por perfil evita colocar todos os tokens em um único item do SecureStore.
const profileKey = id => `vikash.profile.${Array.from(id).map(char => char.charCodeAt(0).toString(16)).join('-')}`;
const readJson = async key => {
  const value = await readValue(key);
  return value ? JSON.parse(value) : null;
};
const readIndex = async () => (await readJson(indexKey)) || { ids: [], activeId: null };
function serializeWrite(action) {
  const pending = writes.then(action);
  writes = pending.catch(() => {});
  return pending;
}

export async function loadSession() {
  await writes;
  const index = await readIndex();
  if (index.activeId) { return readJson(profileKey(index.activeId)); }
  return readJson(legacyKey);
}

export async function loadProfileSessions() {
  await writes;
  const index = await readIndex();
  const sessions = await Promise.all(index.ids.map(id => readJson(profileKey(id))));
  return sessions.filter(session => sessionProfileId(session));
}

export function storeSession(session, { activate = true } = {}) {
  return serializeWrite(async () => {
    const tokens = { accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt };
    const id = sessionProfileId(session);
    if (!id) { await writeValue(legacyKey, JSON.stringify(tokens)); return; }
    const user = { uuid: session.user.uuid, name: session.user.name, email: session.user.email };
    const index = await readIndex();
    await writeValue(profileKey(id), JSON.stringify({ ...tokens, user }));
    if (!index.ids.includes(id)) { index.ids.push(id); }
    if (activate) { index.activeId = id; }
    await writeValue(indexKey, JSON.stringify(index));
    await removeValue(legacyKey);
  });
}

export function expireProfileSession(id) {
  return serializeWrite(async () => {
    const index = await readIndex();
    const saved = await readJson(profileKey(id));
    if (saved?.user) { await writeValue(profileKey(id), JSON.stringify({ user: saved.user })); }
    if (index.activeId === id) { index.activeId = null; }
    await writeValue(indexKey, JSON.stringify(index));
  });
}

export function removeProfileSession(id) {
  return serializeWrite(async () => {
    const index = await readIndex();
    index.ids = index.ids.filter(value => value !== id);
    if (index.activeId === id) { index.activeId = null; }
    await writeValue(indexKey, JSON.stringify(index));
    await removeValue(profileKey(id));
  });
}

export function clearSession() {
  return serializeWrite(async () => {
    const index = await readIndex();
    if (index.activeId) {
      const saved = await readJson(profileKey(index.activeId));
      if (saved?.user) { await writeValue(profileKey(index.activeId), JSON.stringify({ user: saved.user })); }
      index.activeId = null;
      await writeValue(indexKey, JSON.stringify(index));
    }
    await removeValue(legacyKey);
  });
}
