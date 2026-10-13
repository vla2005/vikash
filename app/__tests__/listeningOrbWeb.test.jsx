import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import ListeningOrb from '../src/components/ListeningOrb.web';
import ListeningWave from '../src/components/ListeningWave.web';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Circle: 'Circle',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Path: 'Path',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
}));

let renderer;
let frame;
let changeState;
let requestFrame;
let cancelFrame;
beforeEach(() => {
  requestFrame = jest
    .spyOn(global, 'requestAnimationFrame')
    .mockImplementation(callback => {
      frame = callback;
      return 42;
    });
  cancelFrame = jest
    .spyOn(global, 'cancelAnimationFrame')
    .mockImplementation(() => {});
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    changeState = listener;
    return { remove: jest.fn() };
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test.each([
  ['esfera Vite DOM', ListeningOrb, 'Vite DOM'],
  ['esfera Expo SVG', ListeningOrb, 'Expo SVG'],
  ['ondas Vite DOM', ListeningWave, 'Vite DOM'],
  ['ondas Expo SVG', ListeningWave, 'Expo SVG'],
])(
  'deforma %s e cancela o frame ao parar ou sair do app',
  async (_, Component, platform) => {
    const paths = [];
    const update = jest.fn();
    await act(async () => {
      renderer = TestRenderer.create(<Component active />, {
        createNodeMock: element => {
          if (element.type !== 'Path') {
            return null;
          }
          const path =
            platform === 'Vite DOM'
              ? { setAttribute: jest.fn(update) }
              : { setNativeProps: jest.fn(update) };
          paths.push(path);
          return path;
        },
      });
    });
    expect(requestFrame).toHaveBeenCalled();
    await act(async () => frame(0));
    const initial = update.mock.calls[0];
    update.mockClear();
    await act(async () => frame(1200));
    expect(update.mock.calls[0]).not.toEqual(initial);
    expect(paths.length).toBe(2);
    await act(async () => changeState('background'));
    expect(cancelFrame).toHaveBeenCalledWith(42);
    requestFrame.mockClear();
    await act(async () => changeState('active'));
    expect(requestFrame).toHaveBeenCalledTimes(1);
    cancelFrame.mockClear();
    await act(async () => renderer.update(<Component active={false} />));
    expect(cancelFrame).toHaveBeenCalledWith(42);
  },
);
