import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Platform, TextInput } from 'react-native';
import VoiceDrawer from '../src/components/VoiceDrawer';
import { requireOptionalNativeModule } from 'expo';
jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
jest.mock('../src/services/speechRecognition', () => jest.requireActual('../src/services/speechRecognition'));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
let renderer;
let events;
let native;
const originalState = AppState.currentState;
beforeEach(() => {
  events = {};
  native = {
    addListener: jest.fn((name, handler) => { events[name] = handler; return { remove: jest.fn() }; }),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    isRecognitionAvailable: jest.fn(() => true),
    getSpeechRecognitionServices: jest.fn(() => ['com.google.android.tts']),
    getDefaultRecognitionService: jest.fn(() => ({ packageName: 'com.google.android.tts' })),
    start: jest.fn(), stop: jest.fn(), abort: jest.fn(),
  };
  requireOptionalNativeModule.mockReturnValue(native);
  AppState.currentState = 'active';
});
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; AppState.currentState = originalState; jest.restoreAllMocks(); });
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
test.each(['ios','android'])('%s exibe o resultado do serviço nativo, permite revisar e envia a transcrição confirmada', async os => {
  jest.replaceProperty(Platform,'OS',os);
  const confirm = jest.fn(async () => {});
  const close = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<VoiceDrawer visible onClose={close} onConfirm={confirm} />); });
  expect(native.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'pt-BR', interimResults: true }));
  await act(async () => events.start());
  await act(async () => events.result({ isFinal:false, results:[{ transcript:'Gastei cinquenta' }] }));
  await act(async () => button('Parar e revisar').props.onPress());
  expect(native.stop).toHaveBeenCalledTimes(1);
  await act(async () => { events.result({ isFinal:true, results:[{ transcript:'Gastei cinquenta reais no mercado pelo Pix do Inter' }] }); events.end(); });
  expect(renderer.root.findByType(TextInput).props.value).toBe('Gastei cinquenta reais no mercado pelo Pix do Inter');
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(confirm).toHaveBeenCalledWith('Gastei cinquenta reais no mercado pelo Pix do Inter');
  expect(close).toHaveBeenCalledTimes(1);
});


test.each(['android', 'ios'])('%s mantém erro de inicialização legível e permite uma nova tentativa', async os => {
  jest.replaceProperty(Platform, 'OS', os);
  native.start.mockImplementationOnce(() => {
    throw new Error("Call to function 'ExpoSpeechRecognition.start' has been rejected: recordingOptions NullPointerException");
  });
  await act(async () => { renderer = TestRenderer.create(<VoiceDrawer visible onClose={jest.fn()} onConfirm={jest.fn()} />); });
  const text = () => JSON.stringify(renderer.toJSON());
  expect(text()).toContain('Não foi possível iniciar o reconhecimento de voz. Tente novamente.');
  expect(text()).not.toContain('NullPointerException');
  expect(text()).not.toContain('recordingOptions');
  expect(native.start.mock.calls[0][0]).not.toHaveProperty('recordingOptions');
  await act(async () => button('Tentar novamente').props.onPress());
  await act(async () => events.start());
  expect(text()).toContain('Ouvindo você');
  await act(async () => { events.result({ isFinal: true, results: [{ transcript: 'Mercado no Pix do Inter' }] }); events.end(); });
  expect(renderer.root.findByType(TextInput).props.value).toBe('Mercado no Pix do Inter');
});


test('falha inesperada durante a permissão não expõe detalhes internos no drawer', async () => {
  native.getPermissionsAsync.mockRejectedValueOnce(new Error('Native permission record: java.lang.NullPointerException'));
  await act(async () => { renderer = TestRenderer.create(<VoiceDrawer visible onClose={jest.fn()} />); });
  const text = JSON.stringify(renderer.toJSON());
  expect(text).toContain('Não foi possível iniciar o reconhecimento de voz. Tente novamente.');
  expect(text).not.toContain('NullPointerException');
});

test('Expo Go conserva a orientação útil para instalar uma build própria', async () => {
  requireOptionalNativeModule.mockReturnValue(null);
  await act(async () => { renderer = TestRenderer.create(<VoiceDrawer visible onClose={jest.fn()} />); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Ela não está disponível no Expo Go.');
});
