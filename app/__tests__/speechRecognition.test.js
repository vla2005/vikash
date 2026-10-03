import { createSpeechRecognition as createWebRecognition } from '../src/services/speechRecognition.web';
import { createSpeechRecognition as createNativeRecognition } from '../src/services/speechRecognition';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule as native } from 'expo-speech-recognition';
import { requireOptionalNativeModule } from 'expo';
jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
jest.mock('expo-speech-recognition', () => ({ ExpoSpeechRecognitionModule: {
  addListener: jest.fn(), requestPermissionsAsync: jest.fn(), isRecognitionAvailable: jest.fn(() => true),
  start: jest.fn(), stop: jest.fn(), abort: jest.fn(),
} }));
let events;
let removed;
const callbacks = () => ({ onStart: jest.fn(), onEnd: jest.fn(), onError: jest.fn(), onResult: jest.fn() });
beforeEach(() => {
  jest.clearAllMocks(); events = {}; removed = [];
  requireOptionalNativeModule.mockReturnValue(native);
  native.addListener.mockImplementation((name, handler) => { events[name] = handler; const remove = jest.fn(); removed.push(remove); return { remove }; });
  native.requestPermissionsAsync.mockResolvedValue({ granted: true });
});
afterEach(() => { delete global.window; jest.restoreAllMocks(); });

test('web combina resultados finais e parciais sem duplicar frases e cancela callbacks ao fechar', () => {
  const browser = { start() {}, stop() {}, abort() {} };
  global.window = { SpeechRecognition: jest.fn(() => browser) };
  const handlers = callbacks();
  const service = createWebRecognition(handlers);
  expect(browser.lang).toBe('pt-BR');
  expect(browser.interimResults).toBe(true);
  browser.onresult({ results: [[{ transcript: 'Gastei quarenta' }]] });
  browser.onresult({ results: [[{ transcript: 'Gastei quarenta e cinco' }], [{ transcript: 'no almoço' }]] });
  expect(handlers.onResult.mock.calls.map(call => call[0])).toEqual(['Gastei quarenta', 'Gastei quarenta e cinco no almoço']);
  service.dispose();
  expect(browser.onresult).toBeNull();
});

test('web sem reconhecimento mostra indisponibilidade em vez de simular', () => {
  global.window = {};
  expect(() => createWebRecognition(callbacks())).toThrow('Este navegador não oferece transcrição');
});

test('modulo ausente no Expo Go mostra a limitacao sem carregar o pacote nativo', () => {
  requireOptionalNativeModule.mockReturnValue(null);
  expect(() => createNativeRecognition(callbacks())).toThrow('Ela não está disponível no Expo Go.');
  expect(native.addListener).not.toHaveBeenCalled();
  expect(native.start).not.toHaveBeenCalled();
});

test('nativo acumula segmentos finais sem duplicar as hipoteses parciais', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  await service.start();
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'pt-BR', interimResults: true, recordingOptions: { persist: false } }));
  events.result({ results: [{ transcript: 'Gastei' }], isFinal: false });
  events.result({ results: [{ transcript: 'Gastei cinquenta reais' }], isFinal: true });
  events.result({ results: [{ transcript: 'no mercado' }], isFinal: false });
  expect(handlers.onResult).toHaveBeenLastCalledWith('Gastei cinquenta reais no mercado');
  service.dispose();
  expect(removed.every(remove => remove.mock.calls.length === 1)).toBe(true);
});

test('cancelar enquanto aguarda permissao impede iniciar microfone depois', async () => {
  let resolve;
  native.requestPermissionsAsync.mockReturnValue(new Promise(done => { resolve = done; }));
  const service = createNativeRecognition(callbacks()); const pending = service.start();
  service.dispose(); resolve({ granted: true }); await pending;
  expect(native.start).not.toHaveBeenCalled();
});

test('permissao negada nao inicia reconhecimento', async () => {
  native.requestPermissionsAsync.mockResolvedValue({ granted: false });
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  await service.start();
  expect(native.start).not.toHaveBeenCalled();
  expect(handlers.onError).toHaveBeenCalledWith('not-allowed');
  service.dispose();
});
