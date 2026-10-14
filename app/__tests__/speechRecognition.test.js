import { createSpeechRecognition as createWebRecognition } from '../src/services/speechRecognition.web';
import { createSpeechRecognition as createNativeRecognition } from '../src/services/speechRecognition';
import { AppState, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule as native } from 'expo-speech-recognition';
import { requireOptionalNativeModule } from 'expo';
jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
jest.mock('expo-speech-recognition', () => ({ ExpoSpeechRecognitionModule: {
  addListener: jest.fn(), getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), isRecognitionAvailable: jest.fn(() => true),
  getSpeechRecognitionServices: jest.fn(), getDefaultRecognitionService: jest.fn(),
  start: jest.fn(), stop: jest.fn(), abort: jest.fn(),
} }));
let events;
let removed;
const originalAppState = AppState.currentState;
const callbacks = () => ({ onStart: jest.fn(), onEnd: jest.fn(), onError: jest.fn(), onResult: jest.fn() });
beforeEach(() => {
  jest.clearAllMocks(); native.start.mockReset(); events = {}; removed = [];
  requireOptionalNativeModule.mockReturnValue(native);
  native.addListener.mockImplementation((name, handler) => { events[name] = handler; const remove = jest.fn(); removed.push(remove); return { remove }; });
  native.requestPermissionsAsync.mockResolvedValue({ granted: true });
  native.getPermissionsAsync.mockResolvedValue({ granted: false });
  AppState.currentState = 'active';
  native.isRecognitionAvailable.mockReturnValue(true);
  native.getSpeechRecognitionServices.mockReturnValue(['com.google.android.tts']);
  native.getDefaultRecognitionService.mockReturnValue({ packageName: 'com.google.android.tts' });
});
afterEach(() => { delete global.window; AppState.currentState = originalAppState; jest.restoreAllMocks(); });

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
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'pt-BR', interimResults: true }));
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
  await Promise.resolve();
  service.dispose(); resolve({ granted: true }); await pending;
  expect(native.start).not.toHaveBeenCalled();
  expect(native.abort).not.toHaveBeenCalled();
});

test('permissão já concedida não abre outra janela do sistema', async () => {
  native.getPermissionsAsync.mockResolvedValue({ granted: true });
  const service = createNativeRecognition(callbacks());
  await service.start();
  expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(native.start).toHaveBeenCalledTimes(1);
  service.dispose();
});

test('aguarda o retorno da janela de permissão antes de capturar áudio', async () => {
  let changeAppState;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
    changeAppState = handler;
    return { remove: jest.fn() };
  });
  native.requestPermissionsAsync.mockImplementation(async () => {
    AppState.currentState = 'background';
    return { granted: true };
  });
  const service = createNativeRecognition(callbacks());
  const pending = service.start();
  await Promise.resolve(); await Promise.resolve();
  expect(native.start).not.toHaveBeenCalled();
  AppState.currentState = 'active';
  changeAppState('active');
  await pending;
  expect(native.start).toHaveBeenCalledTimes(1);
  service.dispose();
});

test('fechar o drawer enquanto aguarda primeiro plano remove a espera sem iniciar o microfone', async () => {
  AppState.currentState = 'background';
  native.getPermissionsAsync.mockResolvedValue({ granted: true });
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  const pending = service.start();
  await Promise.resolve();
  service.dispose();
  await pending;
  expect(remove).toHaveBeenCalled();
  expect(native.start).not.toHaveBeenCalled();
  expect(native.abort).not.toHaveBeenCalled();
  expect(handlers.onError).not.toHaveBeenCalled();
});

test('eventos atrasados de uma tentativa anterior não encerram a preparação atual', async () => {
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  events.end(); events.error({ error: 'aborted' });
  expect(handlers.onEnd).not.toHaveBeenCalled();
  expect(handlers.onError).not.toHaveBeenCalled();
  await service.start();
  events.start();
  expect(handlers.onStart).toHaveBeenCalledTimes(1);
  service.dispose();
});

test('permissao negada nao inicia reconhecimento', async () => {
  native.requestPermissionsAsync.mockResolvedValue({ granted: false });
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  await service.start();
  expect(native.start).not.toHaveBeenCalled();
  expect(handlers.onError).toHaveBeenCalledWith('not-allowed');
  service.dispose();
});

test('Android captura pelo serviço padrão sem exigir fluxo de áudio contínuo ou modelo offline', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  native.getSpeechRecognitionServices.mockReturnValue(['com.samsung.android.bixby.agent', 'com.google.android.tts']);
  native.getDefaultRecognitionService.mockReturnValue({ packageName: 'com.samsung.android.bixby.agent' });
  const service = createNativeRecognition(callbacks());
  await service.start();
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({
    continuous: false, addsPunctuation: false,
    androidRecognitionServicePackage: 'com.samsung.android.bixby.agent',
  }));
  expect(native.start.mock.calls[0][0].requiresOnDeviceRecognition).toBeUndefined();
  service.dispose();
});

test('Android usa serviço Google disponível quando o padrão não está instalado', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  native.getDefaultRecognitionService.mockReturnValue({ packageName: 'servico.desativado' });
  native.isRecognitionAvailable.mockReturnValue(false);
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  await service.start();
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ androidRecognitionServicePackage: 'com.google.android.tts' }));
  expect(handlers.onError).not.toHaveBeenCalled();
  service.dispose();
});

test('Android sem nenhum serviço de voz mostra indisponibilidade mesmo com microfone permitido', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  native.getSpeechRecognitionServices.mockReturnValue([]);
  native.isRecognitionAvailable.mockReturnValue(false);
  const handlers = callbacks(); const service = createNativeRecognition(handlers);
  await service.start();
  expect(native.start).not.toHaveBeenCalled();
  expect(handlers.onError).toHaveBeenCalledWith('service-not-allowed');
  service.dispose();
});

test('iOS mantém reconhecimento contínuo e pontuação sem consultar serviços Android', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const service = createNativeRecognition(callbacks());
  await service.start();
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ continuous: true, addsPunctuation: true }));
  expect(native.getSpeechRecognitionServices).not.toHaveBeenCalled();
  expect(native.getDefaultRecognitionService).not.toHaveBeenCalled();
  service.dispose();
});


test.each(['android', 'ios'])('%s omite opções de persistência desnecessárias na ponte nativa', async os => {
  jest.replaceProperty(Platform, 'OS', os);
  const service = createNativeRecognition(callbacks());
  await service.start();
  expect(native.start.mock.calls[0][0]).not.toHaveProperty('recordingOptions');
  service.dispose();
});

test.each(['sync', 'async'])('falha %s ao iniciar não vaza o stack nativo nem aceita eventos atrasados', async mode => {
  const failure = new Error("Cannot cast value for field 'recordingOptions': java.lang.NullPointerException");
  if (mode === 'sync') { native.start.mockImplementationOnce(() => { throw failure; }); }
  else { native.start.mockRejectedValueOnce(failure); }
  const handlers = callbacks();
  const service = createNativeRecognition(handlers);
  await expect(service.start()).resolves.toBeUndefined();
  expect(handlers.onError).toHaveBeenCalledWith('recognition-start-failed');
  events.start(); events.end(); events.result({ results: [{ transcript: 'atrasado' }] });
  expect(handlers.onStart).not.toHaveBeenCalled();
  expect(handlers.onEnd).not.toHaveBeenCalled();
  expect(handlers.onResult).not.toHaveBeenCalled();
  service.dispose();
  expect(native.abort).not.toHaveBeenCalled();
});
