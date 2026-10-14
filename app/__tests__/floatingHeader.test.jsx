jest.mock('../src/config/renderingEffects', () => ({ renderingEffects: { backgroundBlur: true } }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import HeaderBackdrop from '../src/components/silver/HeaderBackdrop.jsx';
import WebHeaderBackdrop from '../src/components/silver/HeaderBackdrop.web.jsx';
import FloatingAppHeader from '../src/components/silver/FloatingAppHeader';
import AppHeader from '../src/components/AppHeader';
import DockScrollView from '../src/components/silver/DockScrollView';
import WebDockScrollView from '../src/components/silver/DockScrollView.web.jsx';
import { DockContext } from '../src/contexts/DockContext';
import { header } from '../src/theme/silver';
import useReducedTransparency from '../src/hooks/useReducedTransparency';

jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return {
    __esModule: true,
    default: Shape,
    Defs: Shape,
    LinearGradient: Shape,
    Rect: Shape,
    Stop: Shape,
  };
});
jest.mock('../src/hooks/useReducedTransparency', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

let renderer;
beforeEach(() => useReducedTransparency.mockReturnValue(false));
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test.each(['android', 'ios'])(
  'header usa só um blur e máscara estática no %s',
  async platform => {
    jest.replaceProperty(Platform, 'OS', platform);
    const blurTarget = { current: null };
    await act(async () => {
      renderer = TestRenderer.create(
        <DockContext.Provider value={{ blurTarget }}>
          <HeaderBackdrop topInset={44} />
        </DockContext.Provider>,
      );
    });
    const blurs = renderer.root.findAll(
      node => node.type === BlurView && node.props.intensity,
    );
    expect(blurs).toHaveLength(1);
    if (platform === 'android') {
      expect(blurs[0].props.blurTarget).toBe(blurTarget);
      expect(blurs[0].props.blurMethod).toBe('dimezisBlurViewSdk31Plus');
    }
    const mask = renderer.root.findAll(node => node.props.maskElement)[0];
    expect(mask.props.androidRenderingMode).toBe('hardware');
    // A queda chega a alpha zero; a borda não vira uma faixa opaca.
    const gradient = mask.props.maskElement.props.children[0].props.children;
    expect(gradient.props.y2).toBe('100%');
    expect(gradient.props.children.at(-1).props.stopOpacity).toBe(0);
  },
);

test('reduzir transparência desliga o desfoque; Android sem alvo também usa fallback', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  useReducedTransparency.mockReturnValue(true);
  await act(async () => {
    renderer = TestRenderer.create(<HeaderBackdrop />);
  });
  expect(renderer.root.findAll(node => node.props.intensity)).toHaveLength(0);
  useReducedTransparency.mockReturnValue(false);
  jest.replaceProperty(Platform, 'OS', 'android');
  await act(async () => renderer.update(<HeaderBackdrop />));
  expect(renderer.root.findAll(node => node.props.intensity)).toHaveLength(0);
});

test('na web o fundo usa blur com máscara até transparente e respeita redução de transparência', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<WebHeaderBackdrop topInset={24} />);
  });
  const surface = () =>
    StyleSheet.flatten(
      renderer.root.findAll(node => StyleSheet.flatten(node.props.style)?.pointerEvents === 'none')[0]
        .props.style,
    );
  expect(surface().backdropFilter).toContain('blur(');
  expect(surface().maskImage).toContain('transparent 100%');
  expect(surface().borderWidth).toBeUndefined();
  useReducedTransparency.mockReturnValue(true);
  await act(async () => renderer.update(<WebHeaderBackdrop topInset={25} />));
  expect(surface().backdropFilter).toBeUndefined();
});

test.each([DockScrollView, WebDockScrollView])(
  'reserva o topo dentro do scroller, somando o padding da tela e removendo a reserva nos detalhes',
  async Scroller => {
    const create = headerHeight => (
      <DockContext.Provider value={{ headerHeight, bottomInset: 20 }}>
        <Scroller contentContainerStyle={[styles.content, styles.top]} />
      </DockContext.Provider>
    );
    await act(async () => {
      renderer = TestRenderer.create(create(header.height));
    });
    const contentStyle = () =>
      StyleSheet.flatten(
        renderer.root.findAll(node => node.props.onScroll)[0].props
          .contentContainerStyle,
      );
    expect(contentStyle().paddingTop).toBe(header.height + 8);
    const bottom = contentStyle().paddingBottom;
    await act(async () => renderer.update(create(0)));
    expect(contentStyle().paddingTop).toBe(8);
    expect(contentStyle().paddingBottom).toBe(bottom);
  },
);

test('a sobreposição respeita área segura, deixa toques passarem e desmonta o blur ao ocultar sem desmontar o avatar', async () => {
  const props = {
    topInset: 44,
    profile: { name: 'Viktor' },
    onOpenProfile: jest.fn(),
  };
  await act(async () => {
    renderer = TestRenderer.create(<FloatingAppHeader {...props} visible />);
  });
  const originalHeader = renderer.root.findByType(AppHeader);
  const overlay = () =>
    renderer.root.findAll(node => node.props.testID === 'app-header')[0];
  expect(StyleSheet.flatten(overlay().props.style).pointerEvents).toBe('box-none');
  expect(StyleSheet.flatten(overlay().props.style).paddingTop).toBe(
    44 + header.paddingTop,
  );
  await act(async () =>
    renderer.update(<FloatingAppHeader {...props} visible={false} />),
  );
  expect(overlay().props.accessibilityElementsHidden).toBe(true);
  expect(StyleSheet.flatten(overlay().props.style).display).toBe('none');
  expect(renderer.root.findByType(AppHeader)).toBe(originalHeader);
  expect(renderer.root.findAllByType(HeaderBackdrop)).toHaveLength(0);
});

const styles = StyleSheet.create({
  content: { paddingVertical: 12 },
  top: { paddingTop: 8 },
});
