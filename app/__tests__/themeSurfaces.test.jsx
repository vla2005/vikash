// Exercita também o suporte preservado para futura reativação do tema claro.
jest.mock('../src/config/appearance', () => ({ lightThemeEnabled: true }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  ThemeProvider,
  ThemeVariant,
  useTheme,
} from '../src/contexts/ThemeContext';
import {
  readAppearance,
  writeAppearance,
} from '../src/services/appearanceStorage';
import { silverThemes } from '../src/theme/silver';
import GlassPanel from '../src/components/silver/GlassPanel';
import GlassMaterial from '../src/components/silver/GlassMaterial.ios';
import GlassBackButton from '../src/components/GlassBackButton';
import ToastContent from '../src/components/ToastContent';
import VoiceMicButton from '../src/components/VoiceMicButton';
import useReducedTransparency from '../src/hooks/useReducedTransparency';

jest.mock('../src/services/appearanceStorage', () => ({
  readAppearance: jest.fn(),
  writeAppearance: jest.fn(),
}));
jest.mock('../src/hooks/useReducedTransparency', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const names = [
    'Svg',
    'Circle',
    'Defs',
    'LinearGradient',
    'RadialGradient',
    'Stop',
  ];
  const shapes = Object.fromEntries(
    names.map(name => [name, props => ReactModule.createElement(name, props)]),
  );
  return { __esModule: true, default: shapes.Svg, ...shapes };
});
let renderer;
let theme;
function Surfaces() {
  theme = useTheme();
  return (
    <>
      <GlassPanel testID="themed-panel" />
      <GlassMaterial navigation />
      <GlassMaterial navigation lens />
      <GlassBackButton />
      <ToastContent type="success" message="Perfil atualizado!" />
      <VoiceMicButton label="Parar e revisar" />
    </>
  );
}
beforeEach(() => {
  writeAppearance.mockResolvedValue();
  useReducedTransparency.mockReturnValue(false);
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
});
function verify(scheme) {
  const { colors, effects } = silverThemes[scheme];
  expect(
    StyleSheet.flatten(
      renderer.root.findAll(
        node => node.props.testID === 'themed-panel' && node.props.style,
      )[0].props.style,
    ).backgroundColor,
  ).toBe(effects.glass.fill);
  const navigation = renderer.root
    .findAllByType(GlassMaterial)
    .find(node => !node.props.lens);
  const lens = renderer.root
    .findAllByType(GlassMaterial)
    .find(node => node.props.lens);
  expect(
    navigation.findAllByProps({ glassEffectStyle: 'regular' })[0].props
      .colorScheme,
  ).toBe(scheme);
  expect(
    lens.findAllByProps({ glassEffectStyle: 'regular' })[0].props.colorScheme,
  ).toBe('dark');
  expect(
    renderer.root.findByType(GlassBackButton).findByType('Icon').props.color,
  ).toBe(colors.text);
  expect(
    StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'toast' }).props.style,
    ).backgroundColor,
  ).toBe(effects.toast.fill);
  expect(
    renderer.root.findByType(ToastContent).findByType('Icon').props.color,
  ).toBe(effects.toast.success);
  const stops = renderer.root.findAllByType('Stop');
  expect(stops.map(node => node.props.stopColor)).toContain(
    effects.voiceOrb.control.fillTop,
  );
}
test.each(['light', 'dark'])(
  'materiais, voltar, toast e voz atualizam de %s sem remontar o cenário',
  async scheme => {
    readAppearance.mockResolvedValue(scheme);
    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <ThemeVariant>
            <Surfaces />
          </ThemeVariant>
        </ThemeProvider>,
      );
    });
    const scene = renderer.root.findByType(Surfaces);
    verify(scheme);
    const next = scheme === 'light' ? 'dark' : 'light';
    await act(async () => theme.setPreference(next));
    verify(next);
    expect(renderer.root.findByType(Surfaces)).toBe(scene);
  },
);
