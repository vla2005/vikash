import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import {
  cancelAnimation,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import VoiceScene from '../src/components/VoiceScene';
import VoiceMicGlyph from '../src/components/VoiceMicGlyph';
import { voiceOrb } from '../src/theme/silver';

let mockReduced = false;
jest.mock('../src/hooks/useReducedMotion', () => () => mockReduced);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-reanimated', () => {
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: { View: require('react-native').View },
    useSharedValue: initial => {
      const ref = ReactMock.useRef();
      if (!ref.current) {
        let value = initial;
        ref.current = {
          get: () => value,
          set: next => {
            value = next;
          },
        };
      }
      return ref.current;
    },
    useAnimatedStyle: jest.fn(updater => updater()),
    withTiming: jest.fn(target => target),
    cancelAnimation: jest.fn(),
    Easing: { bezier: () => value => value },
    ReduceMotion: { System: 'system', Never: 'never' },
  };
});

let renderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockReduced = false;
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
});
function scene(review) {
  return (
    <VoiceScene
      review={review}
      distance={200}
      visualOffset={-60}
      visual={<Text>Malha sonora</Text>}
    >
      <TextInput value="Almoço de trinta e cinco reais." />
    </VoiceScene>
  );
}

test('desloca o texto para a área da malha e inverte o mesmo ciclo sem perder a transcrição', async () => {
  await act(async () => {
    renderer = TestRenderer.create(scene(false));
  });
  const originalInput = renderer.root.findByType(TextInput);
  await act(async () => renderer.update(scene(true)));
  expect(withTiming).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({
      duration: voiceOrb.transition.duration,
      reduceMotion: 'never',
    }),
  );
  const reviewStyles = useAnimatedStyle.mock.calls
    .slice(-2)
    .map(([style]) => style());
  expect(reviewStyles[0].opacity).toBe(0);
  expect(reviewStyles[1].transform).toEqual([{ translateY: 0 }]);
  expect(renderer.root.findByType(TextInput)).toBe(originalInput);
  expect(originalInput.props.value).toBe('Almoço de trinta e cinco reais.');
  const sameProgress = cancelAnimation.mock.calls.at(-1)[0];
  await act(async () => renderer.update(scene(false)));
  expect(withTiming).toHaveBeenLastCalledWith(
    0,
    expect.objectContaining({ duration: voiceOrb.transition.duration }),
  );
  const captureStyles = useAnimatedStyle.mock.calls
    .slice(-2)
    .map(([style]) => style());
  expect(captureStyles[0].opacity).toBe(1);
  expect(captureStyles[1].transform).toEqual([{ translateY: 200 }]);
  expect(cancelAnimation.mock.calls.at(-1)[0]).toBe(sameProgress);
});

test('o ícone troca de microfone para confirmação com rotação, escala e opacidade reversíveis', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<VoiceMicGlyph review={false} />);
  });
  await act(async () => renderer.update(<VoiceMicGlyph review />));
  expect(withTiming).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({ duration: voiceOrb.control.iconDuration }),
  );
  const ready = useAnimatedStyle.mock.calls.slice(-2).map(([style]) => style());
  expect(ready[0].opacity).toBe(0);
  expect(ready[1]).toEqual({
    opacity: 1,
    transform: [{ rotate: '0deg' }, { scale: 1 }],
  });
  await act(async () => renderer.update(<VoiceMicGlyph review={false} />));
  const capture = useAnimatedStyle.mock.calls
    .slice(-2)
    .map(([style]) => style());
  expect(capture[0].opacity).toBe(1);
  expect(capture[1].opacity).toBe(0);
});

test('a transição respeita Reduzir movimento sem alterar as ações da revisão', async () => {
  mockReduced = true;
  await act(async () => {
    renderer = TestRenderer.create(scene(false));
  });
  await act(async () => renderer.update(scene(true)));
  expect(withTiming).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({ duration: 0 }),
  );
  expect(renderer.root.findByType(TextInput).props.value).toBe(
    'Almoço de trinta e cinco reais.',
  );
});

test('libera o progresso ao fechar uma transição em andamento', async () => {
  await act(async () => {
    renderer = TestRenderer.create(scene(true));
  });
  cancelAnimation.mockClear();
  await act(async () => renderer.unmount());
  renderer = null;
  expect(cancelAnimation).toHaveBeenCalledTimes(1);
});
