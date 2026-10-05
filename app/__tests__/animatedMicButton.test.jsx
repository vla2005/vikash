import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';
import AnimatedMicButton from '../src/components/AnimatedMicButton';
import useReducedMotion from '../src/hooks/useReducedMotion';

jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');

let renderer;
let loops;
beforeEach(() => {
  loops = [];
  jest.spyOn(Animated, 'delay').mockImplementation(() => ({
    start: callback => callback?.({ finished: true }),
    stop: jest.fn(),
  }));
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const animation = { start: jest.fn(), stop: jest.fn() };
    loops.push(animation);
    return animation;
  });
});
afterEach(async () => {
  if (renderer) { await act(async () => renderer.unmount()); renderer = null; }
  jest.restoreAllMocks();
});

test.each([false, true])('anima o convite e para quando o drawer abre, movimento reduzido: %s', async reduced => {
  useReducedMotion.mockReturnValue(reduced);
  const onPress = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AnimatedMicButton onPress={onPress} />); });
  expect(loops).toHaveLength(reduced ? 3 : 4);
  loops.forEach(animation => expect(animation.start).toHaveBeenCalledTimes(1));
  await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Registrar por voz' }).props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  await act(async () => renderer.update(<AnimatedMicButton onPress={onPress} animate={false} />));
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});

test('não inicia animações quando o componente está estático', async () => {
  useReducedMotion.mockReturnValue(false);
  await act(async () => { renderer = TestRenderer.create(<AnimatedMicButton animate={false} />); });
  expect(loops).toHaveLength(0);
});

test('encerra todas as animações ao desmontar', async () => {
  useReducedMotion.mockReturnValue(false);
  await act(async () => { renderer = TestRenderer.create(<AnimatedMicButton />); });
  await act(async () => { renderer.unmount(); renderer = null; });
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});
