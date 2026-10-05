import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';
import VoiceWaveform from '../src/components/VoiceWaveform';
import useReducedMotion from '../src/hooks/useReducedMotion';

jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn() }));

let renderer;
let loops;
beforeEach(() => {
  loops = [];
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

test.each([false, true])('anima durante a escuta e interrompe ao parar, movimento reduzido: %s', async reduced => {
  useReducedMotion.mockReturnValue(reduced);
  await act(async () => { renderer = TestRenderer.create(<VoiceWaveform active={false} />); });
  expect(loops).toHaveLength(0);
  await act(async () => renderer.update(<VoiceWaveform active />));
  expect(loops.length).toBeGreaterThan(0);
  loops.forEach(animation => expect(animation.start).toHaveBeenCalledTimes(1));
  await act(async () => renderer.update(<VoiceWaveform active={false} />));
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});

test('encerra as animacoes ao fechar o componente durante a escuta', async () => {
  useReducedMotion.mockReturnValue(false);
  await act(async () => { renderer = TestRenderer.create(<VoiceWaveform active />); });
  await act(async () => { renderer.unmount(); renderer = null; });
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});
