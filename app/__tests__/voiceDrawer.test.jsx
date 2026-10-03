import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import VoiceDrawer from '../src/components/VoiceDrawer';
import { createSpeechRecognition } from '../src/services/speechRecognition';
jest.mock('../src/services/speechRecognition', () => ({ createSpeechRecognition: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) }));
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
let renderer;
let events;
let capture;
const close = jest.fn();
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function texts() { return renderer.root.findAllByType(Text).map(node => node.props.children); }
async function open(props = {}) { await act(async () => { renderer = TestRenderer.create(<VoiceDrawer visible onClose={close} {...props} />); }); }
beforeEach(() => {
  jest.useFakeTimers(); close.mockClear();
  capture = { start: jest.fn(async () => events.onStart()), stop: jest.fn(), dispose: jest.fn() };
  createSpeechRecognition.mockImplementation(callbacks => { events = callbacks; return capture; });
});
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); renderer = null; } jest.useRealTimers(); });

test('recebe transcricao parcial, espera resultado final ao parar e permite editar antes de confirmar', async () => {
  const confirm = jest.fn(async () => {});
  await open({ onConfirm: confirm });
  expect(texts()).toContain('Ouvindo você');
  await act(async () => events.onResult('Gastei quarenta'));
  expect(confirm).not.toHaveBeenCalled();
  await act(async () => button('Parar e revisar').props.onPress());
  expect(capture.stop).toHaveBeenCalledTimes(1);
  expect(texts()).toContain('Finalizando transcrição');
  await act(async () => { events.onResult('Gastei quarenta e cinco reais.'); events.onEnd(); });
  const input = renderer.root.findByType(TextInput);
  expect(input.props.value).toBe('Gastei quarenta e cinco reais.');
  expect(texts()).not.toContain('Conta do lançamento');
  await act(async () => input.props.onChangeText('  Gastei cinquenta reais.  '));
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(confirm).toHaveBeenCalledWith('Gastei cinquenta reais.');
  expect(close).toHaveBeenCalledTimes(1);
});

test('sem endpoint nao envia nada nem perde o texto; gravar novamente inicia uma captura limpa', async () => {
  await open();
  await act(async () => { events.onResult('Almoço'); events.onEnd(); });
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(close).not.toHaveBeenCalled();
  expect(texts()).toContain('A análise estará disponível quando a integração com a API estiver pronta.');
  const previousEvents = events;
  await act(async () => button('Gravar novamente').props.onPress());
  expect(capture.dispose).toHaveBeenCalled();
  await act(async () => previousEvents.onResult('Resposta atrasada'));
  expect(texts()).not.toContain('Resposta atrasada');
  expect(texts()).toContain('Ouvindo você');
});

test('aguarda envio sem duplicar e preserva texto quando a API falha', async () => {
  let reject;
  const confirm = jest.fn(() => new Promise((resolve, fail) => { reject = fail; }));
  await open({ onConfirm: confirm });
  await act(async () => { events.onResult('Almoço de 45 reais'); events.onEnd(); });
  let pending;
  await act(async () => {
    const send = button('Confirmar e analisar').props.onPress;
    pending = send();
    await send();
  });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(texts()).toContain('Analisando…');
  expect(button('Confirmar e analisar').props.disabled).toBe(true);
  await act(async () => button('Fechar microfone').props.onPress());
  expect(close).not.toHaveBeenCalled();
  await act(async () => { reject(new Error('Falha na API')); await pending; });
  expect(renderer.root.findByType(TextInput).props.value).toBe('Almoço de 45 reais');
  expect(texts()).toContain('Falha na API');
  expect(button('Confirmar e analisar').props.disabled).toBe(false);
  expect(close).not.toHaveBeenCalled();
});

test('cancelar descarta captura e ignora resultado tardio', async () => {
  await open();
  await act(async () => button('Cancelar gravação').props.onPress());
  expect(capture.dispose).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
  await act(async () => events.onResult('Nao deve aparecer'));
  expect(texts()).not.toContain('Nao deve aparecer');
});

test('permissao negada nao finge que esta ouvindo e permite tentar novamente', async () => {
  capture.start.mockImplementation(async () => events.onError('not-allowed'));
  await open();
  expect(texts()).toContain('Não foi possível ouvir');
  expect(texts()).toContain('Permita o acesso ao microfone e ao reconhecimento de voz para transcrever.');
  expect(button('Tentar novamente')).toBeDefined();
});

test('parada sem evento final libera captura e preserva texto parcial para revisar', async () => {
  await open();
  await act(async () => events.onResult('Mercado'));
  await act(async () => button('Parar e revisar').props.onPress());
  await act(async () => jest.advanceTimersByTime(2500));
  expect(renderer.root.findByType(TextInput).props.value).toBe('Mercado');
  expect(capture.dispose).toHaveBeenCalled();
});

test('sem fala reconhecida mostra erro em vez de revisao vazia', async () => {
  await open();
  await act(async () => events.onEnd());
  expect(texts()).toContain('Não ouvimos nenhuma fala. Tente gravar novamente.');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});
