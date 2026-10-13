import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Text, TextInput } from 'react-native';
import VoiceDrawer from '../src/components/VoiceDrawer';
import DrawerPanel from '../src/components/DrawerPanel';
import VoiceScene from '../src/components/VoiceScene';
import VoiceAnalysisFeedback from '../src/components/VoiceAnalysisFeedback';
import { ApiError } from '../src/services/apiClient';
import { createSpeechRecognition } from '../src/services/speechRecognition';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://test.invalid' }));
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
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); renderer = null; } jest.useRealTimers(); jest.restoreAllMocks(); });

test('a esfera só anima após iniciar a escuta e para ao finalizar ou fechar', async () => {
  capture.start.mockImplementation(async () => {});
  await open();
  const orb = () => renderer.root.findByType('ListeningOrb');
  expect(orb().props.active).toBe(false);
  expect(renderer.root.findByType('ListeningWave').props.active).toBe(false);
  await act(async () => events.onStart());
  expect(orb().props.active).toBe(true);
  expect(renderer.root.findByType('ListeningWave').props.active).toBe(true);
  await act(async () => button('Parar e revisar').props.onPress());
  expect(orb().props.active).toBe(false);
  expect(renderer.root.findByType('ListeningWave').props.active).toBe(false);
  await act(async () => renderer.update(<VoiceDrawer visible={false} onClose={close} />));
  expect(renderer.root.findAllByType('ListeningOrb').every(node => !node.props.active)).toBe(true);
  expect(renderer.root.findAllByType('ListeningWave').every(node => !node.props.active)).toBe(true);
});

test('ocupa a tela inteira e o microfone ativo encerra a captura para revisar o texto completo', async () => {
  await open();
  expect(renderer.root.findByType(DrawerPanel).props.fullScreen).toBe(true);
  expect(button('Parar e revisar').props.accessibilityState.selected).toBe(true);
  const transcription = 'Compra no mercado para a semana. '.repeat(20);
  await act(async () => events.onResult(transcription));
  await act(async () => button('Parar e revisar').props.onPress());
  expect(capture.stop).toHaveBeenCalledTimes(1);
  expect(button('Parar e revisar').props.disabled).toBe(true);
  await act(async () => events.onEnd());
  expect(renderer.root.findByType(TextInput).props.value).toBe(transcription);
  expect(button('Confirmar e analisar').props.accessibilityState.selected).toBe(false);
  expect(button('Editar transcrição')).toBeDefined();
  expect(button('Gravar novamente')).toBeDefined();
});

test('regravar durante a escuta descarta a captura anterior e inicia texto limpo', async () => {
  await open();
  const previousEvents = events;
  await act(async () => events.onResult('Texto anterior'));
  await act(async () => button('Gravar novamente').props.onPress());
  expect(capture.dispose).toHaveBeenCalled();
  await act(async () => previousEvents.onResult('Resposta tardia'));
  expect(texts()).not.toContain('Resposta tardia');
  expect(button('Parar e revisar').props.accessibilityState.selected).toBe(true);
});

test('a pausa temporária da permissão não cancela o microfone antes de começar a ouvir', async () => {
  let changeAppState;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
    if (event === 'change') { changeAppState = handler; }
    return { remove: jest.fn() };
  });
  capture.start.mockImplementation(async () => {
    await Promise.resolve();
    changeAppState('background');
    changeAppState('active');
    events.onStart();
  });
  await open();
  expect(capture.dispose).not.toHaveBeenCalled();
  expect(texts()).toContain('Ouvindo você');
  expect(texts()).not.toContain('Não ouvimos nenhuma fala. Tente gravar novamente.');
  await act(async () => { events.onResult('Gastei dez reais em café'); events.onEnd(); });
  expect(renderer.root.findByType(TextInput).props.value).toBe('Gastei dez reais em café');
});

test('sair do app depois de começar a ouvir interrompe a captura e preserva o texto', async () => {
  let changeAppState;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
    if (event === 'change') { changeAppState = handler; }
    return { remove: jest.fn() };
  });
  await open();
  await act(async () => events.onResult('Gastei dez reais em café'));
  await act(async () => changeAppState('background'));
  expect(capture.dispose).toHaveBeenCalled();
  expect(renderer.root.findByType(TextInput).props.value).toBe('Gastei dez reais em café');
});

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
  expect(button('Tentar novamente').props.disabled).toBe(false);
  expect(close).not.toHaveBeenCalled();
});

test('cancelar descarta captura e ignora resultado tardio', async () => {
  await open();
  await act(async () => button('Fechar microfone').props.onPress());
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
  expect(renderer.root.findByType(VoiceScene).props.review).toBe(true);
  expect(renderer.root.findByType('ListeningWave').props.active).toBe(false);
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

test.each([400, 422])('informações incompletas (%s) aparecem no aviso amarelo e permitem corrigir sem perder o texto', async status => {
  const message = 'Informe a forma de pagamento e a conta ou cartão.';
  const confirm = jest.fn().mockRejectedValueOnce(new ApiError(message, status)).mockResolvedValueOnce();
  await open({ onConfirm: confirm });
  await act(async () => { events.onResult('Gastei R$ 50 na farmácia.'); events.onEnd(); });
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(renderer.root.findByType(VoiceAnalysisFeedback).props.feedback.type).toBe('warn');
  expect(texts()).toContain(message);
  expect(texts()).not.toContain('A análise começa após sua confirmação.');
  expect(button('Corrigir transcrição')).toBeDefined();
  expect(button('Confirmar novamente').props.disabled).toBe(false);
  expect(renderer.root.findByType(TextInput).props.value).toBe('Gastei R$ 50 na farmácia.');
  expect(close).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Gastei R$ 50 na farmácia, no Pix da conta Inter.'));
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(0);
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(confirm).toHaveBeenLastCalledWith('Gastei R$ 50 na farmácia, no Pix da conta Inter.');
  expect(close).toHaveBeenCalledTimes(1);
});

test.each([undefined, 401, 404, 405, 408, 429, 500, 503])('falha técnica (%s) fica vermelha e a nova tentativa usa o mesmo texto', async status => {
  const failure = status ? new ApiError('Não foi possível acessar a API.', status) : new Error('Não foi possível conectar à API.');
  const confirm = jest.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce();
  await open({ onConfirm: confirm });
  await act(async () => { events.onResult('Almoço de R$ 45, no Pix do Inter.'); events.onEnd(); });
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(renderer.root.findByType(VoiceAnalysisFeedback).props.feedback.type).toBe('error');
  expect(texts()).toContain('Sua transcrição foi preservada.');
  expect(button('Corrigir transcrição')).toBeUndefined();
  expect(renderer.root.findByType(TextInput).props.editable).toBe(true);
  expect(close).not.toHaveBeenCalled();
  await act(async () => button('Tentar novamente').props.onPress());
  expect(confirm).toHaveBeenNthCalledWith(2, 'Almoço de R$ 45, no Pix do Inter.');
  expect(close).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(0);
});

test('regravar limpa o aviso e não reaproveita a transcrição que falhou', async () => {
  await open({ onConfirm: jest.fn().mockRejectedValue(new ApiError('Informe a conta.', 400)) });
  await act(async () => { events.onResult('Gastei R$ 50.'); events.onEnd(); });
  await act(async () => button('Confirmar e analisar').props.onPress());
  await act(async () => button('Gravar novamente').props.onPress());
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(0);
  expect(texts()).not.toContain('Gastei R$ 50.');
  expect(button('Parar e revisar')).toBeDefined();
});

test('drawer mostra exatamente os campos faltantes vindos da API', async () => {
  const failure = new ApiError('Complete as informações.', 400, { accountUuid: 'Informe a conta ou banco.' },
    { code: 'VOICE_INFORMATION_REQUIRED', missingFields: ['accountUuid'] });
  await open({ onConfirm: jest.fn().mockRejectedValue(failure) });
  await act(async () => { events.onResult('Gastei R$ 50 na farmácia pelo Pix.'); events.onEnd(); });
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(texts()).toContain('Conta ou banco');
  expect(texts()).toContain('Informe a conta ou banco.');
  expect(texts()).not.toContain('Forma de pagamento');
  expect(renderer.root.findByType(TextInput).props.value).toBe('Gastei R$ 50 na farmácia pelo Pix.');
  expect(close).not.toHaveBeenCalled();
});
