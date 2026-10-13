import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Platform, StyleSheet, Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import AppMotionPolicy from '../src/components/AppMotionPolicy';
import useReducedMotion from '../src/hooks/useReducedMotion';
import AmbientLight from '../src/components/silver/AmbientLight';
import GlassDock from '../src/components/silver/GlassDock';
import Toast from '../src/components/Toast.jsx';
import VoiceScene from '../src/components/VoiceScene';
import WebVoiceScene from '../src/components/VoiceScene.web';
import WebGlassDock from '../src/components/silver/GlassDock.web';

jest.unmock('../src/components/silver/AmbientLight');
jest.mock('../src/hooks/useReducedTransparency', () => () => false);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Defs: 'Defs',
  Ellipse: 'Ellipse',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Rect: 'Rect',
  Stop: 'Stop',
}));

let renderer;
let requestedMotion;
let events;
let policy;
function Probe() {
  policy = useReducedMotion();
  return <Text>{String(policy)}</Text>;
}
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  requestedMotion = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  events = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() });
  jest.spyOn(Reanimated, 'withTiming');
  jest.spyOn(Reanimated, 'withSpring');
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test('política do app ignora a preferência nativa e não assina mudanças do sistema', async () => {
  await act(async () => {
    renderer = TestRenderer.create(
      <>
        <AppMotionPolicy />
        <Probe />
      </>,
    );
  });
  expect(policy).toBe(false);
  expect(renderer.root.findByProps({ mode: 'never' })).toBeDefined();
  expect(requestedMotion).not.toHaveBeenCalled();
  expect(
    events.mock.calls.some(([name]) => name === 'reduceMotionChanged'),
  ).toBe(false);
  requestedMotion.mockResolvedValue(false);
  await act(async () =>
    renderer.update(
      <>
        <AppMotionPolicy />
        <Probe />
      </>,
    ),
  );
  expect(policy).toBe(false);
});

test('luz, lente, toast e revisão continuam animados com Reduzir movimento ligado', async () => {
  await act(async () => {
    renderer = TestRenderer.create(
      <>
        <AmbientLight />
        <GlassDock selected="Statement" onSelect={() => {}} />
        <Toast message="Perfil atualizado!" />
        <VoiceScene
          review
          distance={200}
          visualOffset={-60}
          visual={<Text>Esfera</Text>}
        >
          <Text>Transcrição</Text>
        </VoiceScene>
      </>,
    );
  });
  expect(
    renderer.root.findAll(
      node =>
        StyleSheet.flatten(node.props?.style)?.animationIterationCount ===
        'infinite',
    ).length,
  ).toBeGreaterThan(0);
  expect(Reanimated.withSpring).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ duration: 400, reduceMotion: 'never' }),
  );
  expect(Reanimated.withTiming).toHaveBeenCalledWith(
    0,
    expect.objectContaining({ duration: 180, reduceMotion: 'never' }),
  );
  expect(Reanimated.withTiming).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ duration: 280, reduceMotion: 'never' }),
  );
  expect(requestedMotion).not.toHaveBeenCalled();
});

test('web conserva as durações sem consultar prefers-reduced-motion', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const previous = Object.getOwnPropertyDescriptor(global, 'window');
  const matchMedia = jest.fn(() => ({ matches: true }));
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: { matchMedia },
  });
  try {
    await act(async () => {
      renderer = TestRenderer.create(
        <>
          <Probe />
          <WebGlassDock selected="Statement" onSelect={() => {}} />
          <WebVoiceScene
            review
            distance={200}
            visualOffset={-60}
            visual={<Text>Esfera</Text>}
          >
            <Text>Transcrição</Text>
          </WebVoiceScene>
        </>,
      );
    });
    expect(policy).toBe(false);
    expect(matchMedia).not.toHaveBeenCalled();
    const durations = renderer.root
      .findAll(node => node.props?.style)
      .map(node => StyleSheet.flatten(node.props?.style)?.transitionDuration)
      .filter(Boolean);
    expect(durations).toEqual(expect.arrayContaining(['260ms', '280ms']));
  } finally {
    if (previous) Object.defineProperty(global, 'window', previous);
    else delete global.window;
  }
});
