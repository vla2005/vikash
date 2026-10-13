import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import {
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import ListeningOrb from '../src/components/ListeningOrb';
import ListeningWave from '../src/components/ListeningWave';
import VoiceMicPulse from '../src/components/VoiceMicPulse';
import { voiceOrb } from '../src/theme/silver';
import { createOrbMesh, projectOrb } from '../src/utils/listeningOrb';
import { projectListeningWave } from '../src/utils/listeningWave';

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'SkiaCanvas',
  Fill: 'SkiaFill',
  Shader: 'SkiaShader',
  Group: 'SkiaGroup',
  Path: 'SkiaPath',
  LinearGradient: 'SkiaGradient',
  usePathInterpolation: (_phase, _range, paths) => ({ get: () => paths[0] }),
  Skia: {
    RuntimeEffect: { Make: jest.fn(() => ({})) },
    PathBuilder: {
      Make: () => ({
        moveTo() {},
        lineTo() {},
        build: () => ({}),
      }),
    },
  },
}));
jest.unmock('../src/components/ListeningOrb');
jest.unmock('../src/components/ListeningWave');
jest.unmock('../src/components/VoiceMicPulse');
jest.mock('../src/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => true,
}));
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
jest.mock('react-native-reanimated', () => {
  const MockReact = require('react');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: component => component,
      View: require('react-native').View,
    },
    ReduceMotion: { Never: 'never' },
    Easing: { linear: value => value },
    cancelAnimation: jest.fn(),
    withRepeat: jest.fn(value => value),
    withTiming: jest.fn(value => value),
    useSharedValue: initial => {
      const ref = MockReact.useRef();
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
    useDerivedValue: updater => ({ get: updater }),
    useAnimatedProps: updater => updater(),
    useAnimatedStyle: updater => updater(),
  };
});

let renderer;
let changeState;
let remove;
beforeEach(() => {
  jest.clearAllMocks();
  remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    changeState = listener;
    return { remove };
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test.each([
  ['esfera', ListeningOrb, voiceOrb.duration],
  ['ondas', ListeningWave, voiceOrb.wave.duration],
])(
  'mantém %s animadas mesmo com Reduzir movimento ativado',
  async (_, Component, duration) => {
    await act(async () => {
      renderer = TestRenderer.create(<Component active />);
    });
    expect(withTiming).toHaveBeenCalledWith(
      Math.PI * 2,
      expect.objectContaining({
        duration,
        reduceMotion: 'never',
      }),
    );
    expect(withRepeat).toHaveBeenCalledWith(
      Math.PI * 2,
      -1,
      false,
      undefined,
      'never',
    );
    if (Component === ListeningOrb) {
      expect(renderer.root.findAllByType('Path')).toHaveLength(0);
      expect(renderer.root.findAllByType('SkiaShader')).toHaveLength(1);
      expect(
        renderer.root.findByType('SkiaShader').props.uniforms.get().size,
      ).toBe(voiceOrb.size);
    } else {
      expect(renderer.root.findAllByType('SkiaPath')).toHaveLength(2);
      expect(renderer.root.findAllByType('Svg')).toHaveLength(0);
    }
  },
);

test('o halo do botão indica escuta ativa mesmo com movimento reduzido e encerra ao parar', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<VoiceMicPulse active />);
  });
  expect(withTiming).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ reduceMotion: 'never' }),
  );
  expect(withRepeat).toHaveBeenCalledWith(1, -1, false, undefined, 'never');
  cancelAnimation.mockClear();
  await act(async () => renderer.update(<VoiceMicPulse active={false} />));
  expect(cancelAnimation).toHaveBeenCalled();
  expect(withRepeat).toHaveBeenCalledTimes(1);
});

test.each([
  ['esfera', ListeningOrb],
  ['ondas', ListeningWave],
])(
  'interrompe %s fora da escuta e em segundo plano, liberando-as ao desmontar',
  async (_, Component) => {
    await act(async () => {
      renderer = TestRenderer.create(<Component active={false} />);
    });
    expect(withRepeat).not.toHaveBeenCalled();
    await act(async () => renderer.update(<Component active />));
    expect(withRepeat).toHaveBeenCalledTimes(1);
    cancelAnimation.mockClear();
    await act(async () => changeState('background'));
    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).toHaveBeenCalledTimes(1);
    await act(async () => changeState('active'));
    expect(withRepeat).toHaveBeenCalledTimes(2);
    await act(async () => renderer.update(<Component active={false} />));
    expect(withRepeat).toHaveBeenCalledTimes(2);
    cancelAnimation.mockClear();
    await act(async () => renderer.unmount());
    renderer = null;
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  },
);

test('a malha se deforma sem sair do quadro e fecha o ciclo sem salto', () => {
  const mesh = createOrbMesh();
  const initial = projectOrb(mesh, 0, voiceOrb.radius, voiceOrb.deformation);
  const middle = projectOrb(
    mesh,
    Math.PI / 3,
    voiceOrb.radius,
    voiceOrb.deformation,
  );
  expect(middle.front).not.toBe(initial.front);
  expect(
    projectOrb(mesh, Math.PI * 2, voiceOrb.radius, voiceOrb.deformation),
  ).toEqual(initial);
  for (let i = 0; i < 64; i++) {
    const paths = projectOrb(
      mesh,
      (i * Math.PI) / 32,
      voiceOrb.radius,
      voiceOrb.deformation,
    );
    const values = `${paths.front}${paths.back}`
      .match(/-?\d+(\.\d+)?/g)
      .map(Number);
    expect(
      values.every(value => Number.isFinite(value) && value > 0 && value < 200),
    ).toBe(true);
  }
});

test('as ondas variam sem corte nas bordas ou salto ao reiniciar o ciclo', () => {
  const first = projectListeningWave(0);
  expect(projectListeningWave(Math.PI / 2)).not.toEqual(first);
  expect(projectListeningWave(Math.PI * 2)).toEqual(first);
  for (let i = 0; i < 48; i++) {
    const { strands, ribs } = projectListeningWave((i / 48) * Math.PI * 2);
    const coordinates = `${strands}${ribs}`.match(/-?\d+(\.\d+)?/g).map(Number);
    expect(
      coordinates.every(
        value => Number.isFinite(value) && value >= 0 && value <= 300,
      ),
    ).toBe(true);
    expect(ribs).toMatch(/^M0\.00,66L0\.00,63\.00/);
    expect(ribs).toMatch(/M300\.00,66L300\.00,63\.00$/);
  }
});
