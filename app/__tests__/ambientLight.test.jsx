import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Image, Platform, StyleSheet } from 'react-native';
import AmbientLight from '../src/components/silver/AmbientLight';
import useReducedMotion from '../src/hooks/useReducedMotion';
import { ambientLight } from '../src/theme/silver';

jest.unmock('../src/components/silver/AmbientLight');
jest.mock('../src/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: jest.fn(() => false),
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
let changeState;
let remove;
const fields = () =>
  renderer.root.findAll(
    node =>
      typeof node.props.renderToHardwareTextureAndroid === 'boolean' &&
      StyleSheet.flatten(node.props.style)?.animationName,
  );
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  jest.replaceProperty(Platform, 'OS', 'android');
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

test('Android reutiliza a textura compacta e pausa os dois focos em segundo plano', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<AmbientLight />);
  });
  expect(renderer.root.findAllByType(Image)).toHaveLength(
    ambientLight.fields.length,
  );
  expect(renderer.root.findAllByType('Ellipse')).toHaveLength(0);
  expect(fields().length).toBeGreaterThan(0);
  expect(
    fields().every(node => !node.props.renderToHardwareTextureAndroid),
  ).toBe(true);
  await act(async () => changeState('background'));
  expect(
    fields().every(node => !node.props.renderToHardwareTextureAndroid),
  ).toBe(true);
  expect(
    fields().every(
      node =>
        StyleSheet.flatten(node.props.style).animationPlayState === 'paused',
    ),
  ).toBe(true);
  await act(async () => changeState('active'));
  expect(
    fields().every(node => !node.props.renderToHardwareTextureAndroid),
  ).toBe(true);
  await act(async () => renderer.unmount());
  renderer = null;
  expect(remove).toHaveBeenCalledTimes(1);
});

test('movimento reduzido preserva a luz estática sem reservar texturas de animação', async () => {
  useReducedMotion.mockReturnValue(true);
  await act(async () => {
    renderer = TestRenderer.create(<AmbientLight />);
  });
  expect(fields()).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ renderToHardwareTextureAndroid: true }),
  ).toHaveLength(0);
  expect(renderer.root.findAllByType(Image)).toHaveLength(
    ambientLight.fields.length,
  );
});

test('iOS mantém sua renderização e o mesmo percurso da luz', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await act(async () => {
    renderer = TestRenderer.create(<AmbientLight />);
  });
  expect(fields().length).toBeGreaterThan(0);
  expect(
    fields().every(node => !node.props.renderToHardwareTextureAndroid),
  ).toBe(true);
  expect(
    fields().every(
      node =>
        StyleSheet.flatten(node.props.style).animationIterationCount ===
        'infinite',
    ),
  ).toBe(true);
});

test('pausa quando coberta pelo drawer e retoma ao voltar, sem alocar cache grande', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<AmbientLight />);
  });
  const before = renderer.root
    .findAllByType(Image)
    .map(node => node.props.source);
  await act(async () => {
    renderer.update(<AmbientLight enabled={false} />);
  });
  expect(
    fields().every(
      node =>
        StyleSheet.flatten(node.props.style).animationPlayState === 'paused',
    ),
  ).toBe(true);
  await act(async () => {
    renderer.update(<AmbientLight enabled />);
  });
  expect(
    fields().every(
      node =>
        StyleSheet.flatten(node.props.style).animationPlayState === 'running',
    ),
  ).toBe(true);
  expect(
    renderer.root.findAllByType(Image).map(node => node.props.source),
  ).toEqual(before);
  expect(
    renderer.root.findAllByType(Image).map(node => node.props.tintColor),
  ).toEqual(ambientLight.colors);
});
