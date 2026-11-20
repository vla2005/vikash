import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync } from 'expo-crypto';
import { Platform } from 'react-native';

const keys = new Map();
const revisions = new Map();
const keyName = id => `vikash.biometric.${Array.from(id).map(char => char.charCodeAt(0).toString(16)).join('-')}`;
const options = {
  keychainService: 'vikash.biometric',
  requireAuthentication: true,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationPrompt: 'Confirme sua biometria para entrar no ViKash',
};
function failure(message, properties = {}) { return Object.assign(new Error(message), properties); }
function ensureCurrent(id, version) {
  if ((revisions.get(id) || 0) !== version) { throw failure('A sessão mudou. Tente entrar novamente.'); }
}

export async function biometricCapability() {
  if (Platform.OS === 'web') { return { available: false }; }
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(),
    ]);
    return { available: hardware && enrolled && SecureStore.canUseBiometricAuthentication() };
  } catch { return { available: false }; }
}

export function lockBiometricSessions() {
  for (const id of new Set([...keys.keys(), ...revisions.keys()])) {
    revisions.set(id, (revisions.get(id) || 0) + 1);
  }
  keys.clear();
}
export async function removeBiometricKey(id) {
  revisions.set(id, (revisions.get(id) || 0) + 1);
  keys.delete(id);
  await SecureStore.deleteItemAsync(keyName(id), { keychainService: options.keychainService });
}
export async function unlockBiometricKey(id) {
  const version = revisions.get(id) || 0;
  revisions.set(id, version);
  let encoded;
  try { encoded = await SecureStore.getItemAsync(keyName(id), options); }
  catch (cause) {
    const canceled = /cancel|dismiss|lockout|locked.out/i.test(`${cause.code || ''} ${cause.message || ''}`);
    throw failure(canceled ? 'Biometria cancelada. Você pode tentar novamente ou usar sua senha.'
      : 'Não foi possível usar a biometria. Entre com e-mail e senha.', { canceled });
  }
  ensureCurrent(id, version);
  if (!encoded) { throw failure('A biometria do aparelho mudou. Entre com sua senha para ativá-la novamente.', { invalidated: true }); }
  const key = await AESEncryptionKey.import(encoded, 'base64');
  ensureCurrent(id, version);
  keys.set(id, key);
  return encoded;
}
export async function openBiometricSession(record) {
  if (!record?.biometric) { return record; }
  const id = record.user.uuid || record.user.email?.trim().toLowerCase();
  const key = keys.get(id);
  if (!key) { return { user: record.user, biometricEnabled: true, biometricLocked: true }; }
  try {
    const bytes = await aesDecryptAsync(AESSealedData.fromCombined(record.ciphertext), key, { output: 'bytes' });
    return { ...JSON.parse(new global.TextDecoder().decode(bytes)), biometricEnabled: true };
  } catch { throw failure('Não foi possível recuperar esta sessão. Entre com sua senha.', { invalidated: true }); }
}
export async function sealBiometricSession(id, session) {
  const key = keys.get(id);
  if (!key) { throw failure('Desbloqueie a biometria desta conta antes de continuar.'); }
  const sealed = await aesEncryptAsync(new global.TextEncoder().encode(JSON.stringify(session)), key);
  return { version: 1, biometric: true, user: session.user, ciphertext: await sealed.combined('base64') };
}
export async function createBiometricSession(id, session) {
  if (!(await biometricCapability()).available) {
    throw failure('Cadastre uma biometria compatível nas configurações do aparelho para ativar esta opção.');
  }
  const version = revisions.get(id) || 0;
  revisions.set(id, version);
  const key = await AESEncryptionKey.generate(256);
  const encoded = await key.encoded('base64');
  ensureCurrent(id, version);
  try { await SecureStore.setItemAsync(keyName(id), encoded, options); }
  catch (cause) {
    const canceled = /cancel|dismiss|lockout|locked.out/i.test(`${cause.code || ''} ${cause.message || ''}`);
    throw failure(canceled ? 'Ativação da biometria cancelada.' : 'Não foi possível ativar a biometria. Tente novamente.', { canceled });
  }
  // A leitura comprova a autenticação também no iOS, onde criar o item não pede biometria.
  const verified = await unlockBiometricKey(id);
  if (verified !== encoded) { throw failure('Não foi possível validar a proteção biométrica. Tente novamente.'); }
  ensureCurrent(id, version);
  return sealBiometricSession(id, session);
}
