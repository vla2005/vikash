import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as motion from 'react-native-reanimated';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import VoiceDrawer from '../src/components/VoiceDrawer';
import VoiceScene from '../src/components/VoiceScene';
import VoiceComposer from '../src/components/VoiceComposer';
import ListeningOrb from '../src/components/ListeningOrb';
import { createSpeechRecognition } from '../src/services/speechRecognition';

jest.mock('../src/services/speechRecognition', () => ({
  createSpeechRecognition: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 20 }),
}));
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
const originalPlatform = Platform.OS;
let renderer, listeners, captureEvents, close, confirm, dismiss;
const button = label =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
const area = () => renderer.root.findByType(KeyboardAvoidingView);
const layout = height =>
  act(async () =>
    area().instance._onLayout({
      persist() {},
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
    }),
  );
const keyboard = (event, y = 500) =>
  act(async () => {
    for (const listener of listeners.get(event) || []) {
      listener({
        duration: 250,
        easing: 'keyboard',
        endCoordinates: { screenX: 0, screenY: y, width: 390, height: 800 - y },
      });
    }
  });
const outerStyle = () =>
  StyleSheet.flatten(area().findAll(node => node.type === View)[0].props.style);
async function mount(platform) {
  Platform.OS = platform;
  await act(async () => {
    renderer = TestRenderer.create(
      <VoiceDrawer visible onClose={close} onConfirm={confirm} />,
    );
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  listeners = new Map();
  close = jest.fn();
  confirm = jest.fn(async () => {});
  dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return { remove: () => listeners.get(event).delete(callback) };
  });
  createSpeechRecognition.mockImplementation(events => {
    captureEvents = events;
    return {
      start: async () => events.onStart(),
      stop: jest.fn(),
      dispose: jest.fn(),
    };
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  Platform.OS = originalPlatform;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each(['android', 'ios'])(
  'tocar no fundo em %s fecha somente o teclado, mantém o campo e permite confirmar com um toque',
  async platform => {
    await mount(platform);
    await act(async () => button('Digitar').props.onPress());
    const input = renderer.root.findByType(TextInput);
    await act(async () =>
      input.props.onChangeText('Mercado R$ 50, Pix no Inter'),
    );
    dismiss.mockClear();
    // A camada interna pode ficar com o responder: só a fase de captura é
    // despachada no ancestral, sem grant/release no fundo.
    const event = {
      persist() {},
      target: { name: 'camada da esfera' },
      nativeEvent: { pageX: 10, pageY: 200, timestamp: 1 },
    };
    await act(async () => {
      expect(area().props.onStartShouldSetResponderCapture(event)).toBe(false);
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(renderer.root.findByType(TextInput)).toBe(input);
    expect(input.props.value).toBe('Mercado R$ 50, Pix no Inter');
    expect(button('Voltar ao microfone')).toBeDefined();
    await act(async () => button('Confirmar e analisar').props.onPress());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith('Mercado R$ 50, Pix no Inter');
  },
);

test('Android reduz a área disponível acima do teclado e restaura ao fechar, sem alterar o campo multilinha', async () => {
  await mount('android');
  await act(async () => button('Digitar').props.onPress());
  const input = renderer.root.findByType(TextInput);
  await act(async () => {
    input.props.onChangeText('Mercado por Pix no Inter. '.repeat(40));
    input.props.onContentSizeChange({
      nativeEvent: { contentSize: { height: 800 } },
    });
  });
  await layout(800);
  await keyboard('keyboardDidShow', 500);
  expect(outerStyle().height).toBe(500);
  expect(outerStyle().flex).toBe(0);
  expect(renderer.root.findByType(TextInput)).toBe(input);
  expect(input.props.scrollEnabled).toBe(true);
  // A medição muda após a redução; não descontar os mesmos 300 px de novo.
  await layout(500);
  expect(outerStyle().height).toBe(500);
  await keyboard('keyboardDidHide', 800);
  expect(outerStyle().height).toBeUndefined();
  expect(outerStyle().flex).toBe(1);
});

test('iOS conserva ajuste em padding e a edição da transcrição após tocar fora', async () => {
  await mount('ios');
  await act(async () => {
    captureEvents.onResult('Almoço de 40 reais');
    captureEvents.onEnd();
  });
  const input = renderer.root.findByType(TextInput);
  await layout(800);
  await keyboard('keyboardWillShow', 500);
  expect(outerStyle().paddingBottom).toBe(300);
  await act(async () =>
    area().props.onStartShouldSetResponderCapture({
      target: { name: 'fundo da revisão' },
    }),
  );
  expect(input.props.value).toBe('Almoço de 40 reais');
  expect(close).not.toHaveBeenCalled();
  await keyboard('keyboardWillHide', 800);
  expect(outerStyle().paddingBottom).toBe(0);
});

test('Android com janela já redimensionada não desconta a altura do teclado novamente', async () => {
  await mount('android');
  await act(async () => button('Digitar').props.onPress());
  await layout(800);
  await layout(500);
  await keyboard('keyboardDidShow', 500);
  expect(outerStyle().height).toBeUndefined();
  expect(outerStyle().flex).toBe(1);
});

test('o caminho web mantém seus eventos de foco sem adicionar captura de toque externa', async () => {
  await mount('web');
  await act(async () => button('Digitar').props.onPress());
  expect(area().props.onStartShouldSetResponderCapture).toBeUndefined();
  expect(area().props.behavior).toBeUndefined();
  expect(renderer.root.findByType(TextInput).props.editable).toBe(true);
});

test.each(['ios', 'android'])(
  'a captura em %s ignora o input e os descendentes do campo de vidro, sem cancelar gestos',
  async platform => {
    await mount(platform);
    await act(async () => button('Digitar').props.onPress());
    const input = renderer.root.findByType(TextInput);
    const shell = renderer.root.findAllByProps({
      testID: 'voice-keyboard-shell',
    })[0].instance;
    const inside = { name: 'ícone e espaço interno do campo' };
    shell.contains = jest.fn(target => target === inside);
    input.instance.blur.mockClear();
    dismiss.mockClear();
    const stopPropagation = jest.fn();
    await act(async () => {
      expect(
        area().props.onStartShouldSetResponderCapture({
          target: inside,
          stopPropagation,
        }),
      ).toBe(false);
      expect(
        area().props.onStartShouldSetResponderCapture({
          target: input.instance,
          stopPropagation,
        }),
      ).toBe(false);
    });
    expect(shell.contains).toHaveBeenCalledWith(inside);
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(input.instance.blur).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () =>
      area().props.onStartShouldSetResponderCapture({
        target: { name: 'fundo' },
        stopPropagation,
      }),
    );
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(input.instance.blur).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
    input.instance.focus.mockClear();
    await act(async () => button('Editar lançamento').props.onPress());
    expect(input.instance.focus).toHaveBeenCalledTimes(1);
  },
);

test('tocar fora durante a expansão cancela o foco pendente; a animação não reabre o teclado no iPhone', async () => {
  const completions = [];
  jest
    .spyOn(motion, 'withTiming')
    .mockImplementation((value, config, complete) => {
      if (complete) completions.push(complete);
      return value;
    });
  await mount('ios');
  await act(async () => button('Digitar').props.onPress());
  const input = renderer.root.findByType(TextInput);
  input.instance.focus.mockClear();
  await act(async () =>
    area().props.onStartShouldSetResponderCapture({
      target: { name: 'esfera' },
    }),
  );
  await act(async () => completions.at(-1)(true));
  expect(input.instance.focus).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  await act(async () => button('Editar lançamento').props.onPress());
  expect(input.instance.focus).toHaveBeenCalledTimes(1);
});


test.each(['android', 'ios'])(
  'o orbe continua visível em %s quando o teclado encurta a cena de digitação',
  async platform => {
    await mount(platform);
    await act(async () => button('Digitar').props.onPress());
    const scene = renderer.root.findByType(VoiceScene);
    await act(async () => scene.props.onLayout({ nativeEvent: { layout: { height: 180 } } }));
    expect(renderer.root.findByType(ListeningOrb).props.size).toBeGreaterThan(100);
    expect(scene.props.visualOffset).toBe(0);
    const input = renderer.root.findByType(TextInput);
    await act(async () => scene.props.onLayout({ nativeEvent: { layout: { height: 500 } } }));
    expect(renderer.root.findByType(ListeningOrb).props.size).toBeGreaterThan(100);
    expect(renderer.root.findByType(TextInput)).toBe(input);
  },
);


test.each(['android', 'ios'])(
  'em %s o rodapé aproxima do teclado e restaura ao dispensar sem perder texto',
  async platform => {
    await mount(platform);
    await act(async () => button('Digitar').props.onPress());
    const input = renderer.root.findByType(TextInput);
    await act(async () => input.props.onChangeText('Mercado 50 reais no Pix do Inter'));
    const composer = () => renderer.root.findByType(VoiceComposer);
    expect(composer().props.keyboardDocked).toBe(false);
    await keyboard(platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow');
    expect(composer().props.keyboardDocked).toBe(true);
    const scene = renderer.root.findByType(VoiceScene);
    await act(async () => scene.props.onLayout({ nativeEvent: { layout: { height: 380 } } }));
    expect(renderer.root.findByType(ListeningOrb).props.size).toBe(280);
    expect(scene.props.visualOffset).toBeGreaterThan(0);
    await keyboard(platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide');
    expect(composer().props.keyboardDocked).toBe(false);
    expect(renderer.root.findByType(TextInput)).toBe(input);
    expect(input.props.value).toBe('Mercado 50 reais no Pix do Inter');
  },
);
