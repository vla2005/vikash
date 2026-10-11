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

test('anima durante a escuta e interrompe ao parar', async () => {
  useReducedMotion.mockReturnValue(false);
  await act(async () => { renderer = TestRenderer.create(<VoiceWaveform active={false} />); });
  expect(loops).toHaveLength(0);
  await act(async () => renderer.update(<VoiceWaveform active />));
  expect(loops.length).toBeGreaterThan(0);
  loops.forEach(animation => expect(animation.start).toHaveBeenCalledTimes(1));
  await act(async () => renderer.update(<VoiceWaveform active={false} />));
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});

test('não inicia loops com movimento reduzido e interrompe os existentes ao ativá-lo', async () => {
  useReducedMotion.mockReturnValue(true);
  await act(async () => { renderer = TestRenderer.create(<VoiceWaveform active />); });
  expect(loops).toHaveLength(0);
  useReducedMotion.mockReturnValue(false);
  await act(async () => renderer.update(<VoiceWaveform active />));
  expect(loops).toHaveLength(33);
  useReducedMotion.mockReturnValue(true);
  await act(async () => renderer.update(<VoiceWaveform active />));
  expect(loops).toHaveLength(33);
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});

test('encerra as animacoes ao fechar o componente durante a escuta', async () => {
  useReducedMotion.mockReturnValue(false);
  await act(async () => { renderer = TestRenderer.create(<VoiceWaveform active />); });
  await act(async () => { renderer.unmount(); renderer = null; });
  loops.forEach(animation => expect(animation.stop).toHaveBeenCalledTimes(1));
});
