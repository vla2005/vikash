import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { lockBiometricSessions, biometricCapability, unlockBiometricKey } from '../src/services/biometricSession';
import { storeSession, loadSession, loadProfileSessions, unlockProfileSession, enableProfileBiometrics,
  disableProfileBiometrics, removeProfileSession, clearSession } from '../src/services/sessionStorage';

jest.mock('expo-crypto', () => {
  const crypto = require('node:crypto');
  const { Buffer } = require('node:buffer');
  class Key {
    constructor(bytes) { this.bytes = bytes; }
    static async generate() { return new Key(crypto.randomBytes(32)); }
    static async import(encoded) { return new Key(Buffer.from(encoded, 'base64')); }
    async encoded() { return this.bytes.toString('base64'); }
  }
  return {
    AESEncryptionKey: Key,
    AESSealedData: { fromCombined: value => Buffer.from(value, 'base64') },
    aesEncryptAsync: async (bytes, key) => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key.bytes, iv);
      const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
      return { combined: async () => Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64') };
    },
    aesDecryptAsync: async (sealed, key) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.bytes, sealed.subarray(0, 12));
      decipher.setAuthTag(sealed.subarray(12, 28));
      return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
    },
  };
});

let values;
const session = { accessToken: 'sensitive-access', refreshToken: 'sensitive-refresh', expiresAt: 12345,
  user: { uuid: 'profile-a', name: 'Ana', email: 'ana@example.test' } };
beforeEach(() => {
  lockBiometricSessions(); jest.clearAllMocks(); values = new Map();
  LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
  LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
  SecureStore.canUseBiometricAuthentication.mockReturnValue(true);
  SecureStore.getItemAsync.mockImplementation(async key => values.get(key) || null);
  SecureStore.setItemAsync.mockImplementation(async (key, value) => values.set(key, value));
  SecureStore.deleteItemAsync.mockImplementation(async key => values.delete(key));
});

test('habilitação exige prova biométrica e cifra os tokens sem salvar senha', async () => {
  await storeSession({ ...session, password: 'never-persist' });
  await enableProfileBiometrics('profile-a');
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith(expect.stringContaining('vikash.biometric.'),
    expect.objectContaining({ requireAuthentication: true, keychainService: 'vikash.biometric' }));
  const saved = JSON.stringify([...values.values()]);
  expect(saved).not.toContain('sensitive-access'); expect(saved).not.toContain('sensitive-refresh');
  expect(saved).not.toContain('never-persist');
  expect((await loadSession()).refreshToken).toBe(session.refreshToken);
});
test('reinício só retorna identificação e nunca abre prompt ou libera tokens silenciosamente', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a');
  lockBiometricSessions(); SecureStore.getItemAsync.mockClear();
  expect(await loadSession()).toEqual({ user: session.user, biometricEnabled: true, biometricLocked: true });
  expect(await loadProfileSessions()).toEqual([{ user: session.user, biometricEnabled: true, biometricLocked: true }]);
  expect(SecureStore.getItemAsync.mock.calls.some(([, options]) => options?.requireAuthentication)).toBe(false);
});
test('desbloquear recupera a sessão e a rotação continua cifrada sem repetir o prompt', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a'); lockBiometricSessions();
  expect((await unlockProfileSession('profile-a')).refreshToken).toBe(session.refreshToken);
  SecureStore.getItemAsync.mockClear();
  await storeSession({ ...session, refreshToken: 'rotated-sensitive' });
  expect((await loadSession()).refreshToken).toBe('rotated-sensitive');
  expect(JSON.stringify([...values.values()])).not.toContain('rotated-sensitive');
  expect(SecureStore.getItemAsync.mock.calls.some(([, options]) => options?.requireAuthentication)).toBe(false);
});
test('cancelar o prompt preserva a sessão bloqueada para tentar novamente', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a'); lockBiometricSessions();
  const read = SecureStore.getItemAsync.getMockImplementation();
  SecureStore.getItemAsync.mockImplementation((key, options) => options?.requireAuthentication
    ? Promise.reject(new Error('User canceled authentication')) : read(key));
  await expect(unlockProfileSession('profile-a')).rejects.toMatchObject({ canceled: true });
  expect((await loadSession()).biometricLocked).toBe(true);
});
test('biometria alterada não libera credenciais e a senha pode recuperar a conta', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a'); lockBiometricSessions();
  const read = SecureStore.getItemAsync.getMockImplementation();
  SecureStore.getItemAsync.mockImplementation((key, options) => options?.requireAuthentication ? null : read(key));
  await expect(unlockProfileSession('profile-a')).rejects.toMatchObject({ invalidated: true });
  await storeSession({ ...session, refreshToken: 'new-password-login' }, { passwordLogin: true });
  expect((await loadSession()).refreshToken).toBe('new-password-login');
  expect((await loadSession()).biometricEnabled).toBeUndefined();
});
test('desativar remove a chave e volta ao armazenamento normal da sessão', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a');
  await disableProfileBiometrics('profile-a'); lockBiometricSessions();
  expect(await loadSession()).toEqual(session);
  expect([...values.keys()].some(key => key.startsWith('vikash.biometric.'))).toBe(false);
});
test('logout apaga os tokens e a chave e preserva outras contas', async () => {
  const other = { ...session, user: { ...session.user, uuid: 'profile-b' } };
  await storeSession(other); await storeSession(session); await enableProfileBiometrics('profile-a');
  await clearSession(); lockBiometricSessions();
  expect(await loadSession()).toBeNull();
  expect((await loadProfileSessions()).find(item => item.user.uuid === 'profile-a')).toEqual({ user: session.user });
  expect((await loadProfileSessions()).find(item => item.user.uuid === 'profile-b')).toEqual(other);
});
test('prompt cancelado ao ativar não perde a sessão normal nem deixa chave órfã', async () => {
  await storeSession(session);
  const read = SecureStore.getItemAsync.getMockImplementation();
  SecureStore.getItemAsync.mockImplementation((key, options) => options?.requireAuthentication
    ? Promise.reject(new Error('User canceled')) : read(key));
  await expect(enableProfileBiometrics('profile-a')).rejects.toMatchObject({ canceled: true });
  expect(await loadSession()).toEqual(session);
  expect([...values.keys()].some(key => key.startsWith('vikash.biometric.'))).toBe(false);
});
test('um desbloqueio pendente não ressuscita a chave após remoção da conta', async () => {
  await storeSession(session); await enableProfileBiometrics('profile-a'); lockBiometricSessions();
  let finish;
  const encoded = [...values.entries()].find(([key]) => key.startsWith('vikash.biometric.'))[1];
  const read = SecureStore.getItemAsync.getMockImplementation();
  SecureStore.getItemAsync.mockImplementation((key, options) => options?.requireAuthentication
    ? new Promise(resolve => { finish = resolve; }) : read(key));
  const pending = unlockBiometricKey('profile-a');
  await removeProfileSession('profile-a'); finish(encoded);
  await expect(pending).rejects.toThrow('sessão mudou');
  expect(await loadProfileSessions()).toEqual([]);
});
test('aparelho sem biometria cadastrada não oferece habilitação', async () => {
  LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
  expect(await biometricCapability()).toEqual({ available: false });
});
