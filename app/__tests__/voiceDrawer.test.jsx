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


test('Digitar encerra o microfone, ignora eventos tardios e analisa apenas o texto digitado', async () => {
  const confirm = jest.fn(async () => {});
  await open({ onConfirm: confirm });
  const previous = events;
  await act(async () => button('Digitar').props.onPress());
  expect(capture.dispose).toHaveBeenCalled();
  expect(renderer.root.findByType('ListeningOrb').props.active).toBe(true);
  expect(renderer.root.findByType('ListeningWave').props.active).toBe(false);
  expect(button('Confirmar e analisar').props.disabled).toBe(true);
  const field = () => renderer.root.findByType(TextInput);
  expect(field().props.accessibilityLabel).toBe('Descrição do lançamento');
  await act(async () => field().props.onChangeText('  Mercado R$ 50 por Pix no Inter  '));
  await act(async () => { previous.onResult('Fala atrasada'); previous.onEnd(); });
  expect(field().props.value).toBe('  Mercado R$ 50 por Pix no Inter  ');
  expect(confirm).not.toHaveBeenCalled();
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(confirm).toHaveBeenCalledWith('Mercado R$ 50 por Pix no Inter');
  expect(close).toHaveBeenCalledTimes(1);
});

test('preserva rascunho ao alternar, mas limpa e volta à voz depois de fechar', async () => {
  await open();
  await act(async () => button('Digitar').props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Meu rascunho'));
  await act(async () => button('Voltar ao microfone').props.onPress());
  expect(texts()).toContain('Ouvindo você');
  await act(async () => button('Digitar').props.onPress());
  expect(renderer.root.findByType(TextInput).props.value).toBe('Meu rascunho');
  const starts = createSpeechRecognition.mock.calls.length;
  await act(async () => renderer.update(<VoiceDrawer visible={false} onClose={close} />));
  await act(async () => renderer.update(<VoiceDrawer visible onClose={close} />));
  expect(createSpeechRecognition).toHaveBeenCalledTimes(starts + 1);
  expect(button('Parar e revisar').props.accessibilityState.selected).toBe(true);
  await act(async () => button('Digitar').props.onPress());
  expect(renderer.root.findByType(TextInput).props.value).toBe('');
});

test.each([400, 503])('erro da análise digitada (%s) mantém texto e usa aviso no drawer', async status => {
  const confirm = jest.fn().mockRejectedValueOnce(new ApiError('Falha de teste', status)).mockResolvedValueOnce();
  await open({ onConfirm: confirm });
  await act(async () => button('Digitar').props.onPress());
  const field = () => renderer.root.findByType(TextInput);
  await act(async () => field().props.onChangeText('Mercado R$ 50'));
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(field().props.value).toBe('Mercado R$ 50');
  expect(renderer.root.findByType(VoiceAnalysisFeedback).props.feedback.type).toBe(status === 400 ? 'warn' : 'error');
  expect(close).not.toHaveBeenCalled();
  if (status === 400) { expect(button('Corrigir texto')).toBeDefined(); }
  else { expect(texts()).toContain('Seu texto foi preservado.'); }
  await act(async () => field().props.onChangeText('Mercado R$ 50, Pix no Inter'));
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(confirm).toHaveBeenLastCalledWith('Mercado R$ 50, Pix no Inter');
  expect(close).toHaveBeenCalledTimes(1);
});

test('análise digitada bloqueia duplicação e troca de modo até terminar', async () => {
  let finish;
  const confirm = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  await open({ onConfirm: confirm });
  await act(async () => button('Digitar').props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Mercado, R$ 50, Pix no Inter'));
  let pending;
  await act(async () => {
    const send = button('Confirmar e analisar').props.onPress;
    pending = send();
    await send();
  });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
  expect(button('Voltar ao microfone').props.disabled).toBe(true);
  await act(async () => button('Voltar ao microfone').props.onPress());
  expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
  await act(async () => { finish(); await pending; });
  expect(close).toHaveBeenCalledTimes(1);
});


test('cada abertura começa em voz, sem campo digitado aberto', async () => {
  const before = createSpeechRecognition.mock.calls.length;
  await open();
  expect(createSpeechRecognition).toHaveBeenCalledTimes(before + 1);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(button('Parar e revisar').props.accessibilityState.selected).toBe(true);
});


test('botão de teclado e input compartilham o mesmo contêiner e não criam abas', async () => {
  await open();
  const shell = renderer.root.findAllByProps({ testID: 'voice-keyboard-shell' })[0];
  const orb = renderer.root.findByType('ListeningOrb');
  expect(renderer.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  await act(async () => button('Digitar').props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'voice-keyboard-shell' })[0]).toBe(shell);
  expect(renderer.root.findByType('ListeningOrb')).toBe(orb);
  const field = renderer.root.findByType(TextInput);
  await act(async () => field.props.onChangeText('Rascunho preservado'));
  await act(async () => button('Voltar ao microfone').props.onPress());
  expect(renderer.root.findAllByProps({ testID: 'voice-keyboard-shell' })[0]).toBe(shell);
  await act(async () => button('Digitar').props.onPress());
  expect(renderer.root.findByType(TextInput)).toBe(field);
  expect(field.props.value).toBe('Rascunho preservado');
});

test('expandir o teclado pausa o relógio de captura e permite texto longo com rolagem', async () => {
  await open();
  await act(async () => button('Digitar').props.onPress());
  await act(async () => jest.advanceTimersByTime(3000));
  expect(texts()).toContain('00:00');
  const field = renderer.root.findByType(TextInput);
  const longText = 'Mercado por Pix no Inter. '.repeat(50);
  await act(async () => {
    field.props.onChangeText(longText);
    field.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 800 } } });
  });
  expect(field.props.scrollEnabled).toBe(true);
  expect(field.props.value).toBe(longText);
  expect(field.props.style.flat().some(style => style?.height === 88)).toBe(true);
});


test('fechar após falha de voz limpa transcrição, aviso, relógio e callbacks antigos', async () => {
  const confirm = jest.fn().mockRejectedValue(new ApiError('Informe o banco.', 422));
  await open({ onConfirm: confirm });
  const oldCapture = events;
  await act(async () => {
    jest.advanceTimersByTime(3000);
    events.onResult('Uma transcrição antiga');
    events.onEnd();
  });
  await act(async () => button('Confirmar e analisar').props.onPress());
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(1);
  await act(async () => renderer.update(<VoiceDrawer visible={false} onClose={close} onConfirm={confirm} />));
  await act(async () => {
    oldCapture.onResult('Evento antigo depois de fechar');
    oldCapture.onEnd();
  });
  await act(async () => renderer.update(<VoiceDrawer visible onClose={close} onConfirm={confirm} />));
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(0);
  expect(texts()).toContain('00:00');
  expect(texts()).not.toContain('Uma transcrição antiga');
  expect(texts()).not.toContain('Evento antigo depois de fechar');
  expect(button('Parar e revisar').props.disabled).toBe(false);
});

test.each(['success', 'error'])('resposta %s de análise anterior não interfere em uma nova abertura', async result => {
  let complete, reject;
  const confirm = jest.fn(() => new Promise((resolve, fail) => { complete = resolve; reject = fail; }));
  await open({ onConfirm: confirm });
  await act(async () => button('Digitar').props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Registro antigo'));
  let pending;
  await act(async () => { pending = button('Confirmar e analisar').props.onPress(); });
  await act(async () => renderer.update(<VoiceDrawer visible={false} onClose={close} onConfirm={confirm} />));
  await act(async () => renderer.update(<VoiceDrawer visible onClose={close} onConfirm={confirm} />));
  await act(async () => button('Digitar').props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Registro novo'));
  await act(async () => {
    if (result === 'success') { complete(); }
    else { reject(new ApiError('Erro antigo', 503)); }
    await pending;
  });
  expect(close).not.toHaveBeenCalled();
  expect(renderer.root.findByType(TextInput).props.value).toBe('Registro novo');
  expect(renderer.root.findByType(TextInput).props.editable).toBe(true);
  expect(button('Confirmar e analisar').props.disabled).toBe(false);
  expect(renderer.root.findAllByType(VoiceAnalysisFeedback)).toHaveLength(0);
});
