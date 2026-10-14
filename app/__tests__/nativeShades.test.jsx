import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Image, Platform, StyleSheet } from 'react-native';
import HeaderBackdrop from '../src/components/silver/HeaderBackdrop.jsx';
import DockShade from '../src/components/silver/DockShade';
import AmbientLight from '../src/components/silver/AmbientLight';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { readAppearance } from '../src/services/appearanceStorage';
import { silverThemes } from '../src/theme/silver';

jest.unmock('../src/components/silver/DockShade');
jest.unmock('../src/components/silver/AmbientLight');
jest.mock('../src/config/renderingEffects', () => ({ renderingEffects: { backgroundBlur: false, ambientLight: true } }));
jest.mock('../src/services/appearanceStorage', () => ({ readAppearance: jest.fn(), writeAppearance: jest.fn() }));
jest.mock('../src/hooks/useReducedTransparency', () => () => false);
jest.mock('react-native-svg', () => ({
  __esModule: true, default: 'Svg', Defs: 'Defs', Ellipse: 'Ellipse',
  LinearGradient: 'LinearGradient', RadialGradient: 'RadialGradient', Rect: 'Rect', Stop: 'Stop',
}));
let renderer;
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test.each(['dark', 'light'])('máscaras compactas mantêm cor e posição no Android %s', async scheme => {
  jest.replaceProperty(Platform, 'OS', 'android');
  readAppearance.mockResolvedValue(scheme);
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider><HeaderBackdrop topInset={24} /><DockShade bottomInset={32} /><AmbientLight /></ThemeProvider>);
  });
  const { effects, colors } = silverThemes[scheme];
  const image = id => renderer.root.findAllByType(Image).find(node => node.props.testID === id);
  const headerImage = image('android-header-shade');
  expect(headerImage.props.tintColor).toBe(effects.header.androidShade.color);
  // A imagem de 1px deve ocupar todo o header, sem manter dimensões intrínsecas.
  expect(StyleSheet.flatten(headerImage.props.style)).toMatchObject({ width: '100%', height: '100%' });
  expect(StyleSheet.flatten(headerImage.props.style).opacity).toBe(effects.header.androidShade.opacity);
  expect(image('android-dock-shade').props.tintColor).toBe(effects.dock.androidShade.color);
  expect(StyleSheet.flatten(image('android-dock-shade').props.style)).toMatchObject({ width: '100%', height: '100%' });
  for (let i = 0; i < 2; i++) {
    const fade = image('ambient-edge-fade-' + i);
    expect(fade.props.tintColor).toBe(colors.background);
    expect(fade.props.fadeDuration).toBe(0);
    expect(fade.props.resizeMode).toBe('stretch');
  }
  // Sem SVG full-screen nestas superfícies: sem bitmaps proporcionais ao viewport.
  expect(renderer.root.findAllByType('Svg')).toHaveLength(0);
  expect(StyleSheet.flatten(headerImage.parent.props.style).bottom).toBe(-effects.header.androidShade.overhang);
});

test('iOS conserva os gradientes anteriores da luz e navegação', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  readAppearance.mockResolvedValue('dark');
  await act(async () => {
    renderer = TestRenderer.create(<ThemeProvider><DockShade bottomInset={32} /><AmbientLight /></ThemeProvider>);
  });
  expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  expect(renderer.root.findAllByType('Svg').length).toBeGreaterThan(0);
});
