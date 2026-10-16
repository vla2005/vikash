jest.mock('../src/config/renderingEffects', () => ({ renderingEffects: { backgroundBlur: true } }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import {
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import GlassMaterial from '../src/components/silver/GlassMaterial.ios';
import GlassDock from '../src/components/silver/GlassDock';
import WebGlassDock from '../src/components/silver/GlassDock.web';
import DockLayout from '../src/components/silver/DockLayout';
import { DockContext } from '../src/contexts/DockContext';
import useReducedTransparency from '../src/hooks/useReducedTransparency';
import useReducedMotion from '../src/hooks/useReducedMotion';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../src/hooks/useReducedTransparency', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/components/Icon', () => 'Icon');

let renderer;
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  useReducedTransparency.mockReturnValue(false);
  isGlassEffectAPIAvailable.mockReturnValue(true);
  isLiquidGlassAvailable.mockReturnValue(true);
});
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
    renderer = null;
  }
  jest.restoreAllMocks();
});

test('usa o material nativo somente quando API e Liquid Glass estão disponíveis', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<GlassMaterial />);
  });
  expect(
    renderer.root.findAllByProps({ glassEffectStyle: 'regular' }).length,
  ).toBeGreaterThan(0);
  isGlassEffectAPIAvailable.mockReturnValue(false);
  await act(async () => renderer.update(<GlassMaterial lens />));
  expect(
    renderer.root.findAllByProps({ glassEffectStyle: 'regular' }),
  ).toHaveLength(0);
  isGlassEffectAPIAvailable.mockReturnValue(true);
  isLiquidGlassAvailable.mockReturnValue(false);
  await act(async () => renderer.update(<GlassMaterial />));
  expect(
    renderer.root.findAllByProps({ glassEffectStyle: 'regular' }),
  ).toHaveLength(0);
});

test('respeita reduzir transparência mesmo com suporte a Liquid Glass', async () => {
  useReducedTransparency.mockReturnValue(true);
  await act(async () => {
    renderer = TestRenderer.create(<GlassMaterial />);
  });
  expect(
    renderer.root.findAllByProps({ glassEffectStyle: 'regular' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAll(
      node => node.props.tint === 'systemUltraThinMaterialDark',
    ),
  ).toHaveLength(0);
});

test('compactação mantém só a aba ativa acessível e não bloqueia seu botão de expandir', async () => {
  const expand = jest.fn();
  const onSelect = jest.fn();
  const microphone = jest.fn();
  const context = { collapsed: true, progress: { get: () => 1 }, expand };
  await act(async () => {
    renderer = TestRenderer.create(
      <DockContext.Provider value={context}>
        <GlassDock
          selected="Home"
          onSelect={onSelect}
          onMicrophone={microphone}
        />
      </DockContext.Provider>,
    );
  });
  for (const label of ['Extrato', 'Contas', 'Categorias']) {
    const tab = renderer.root.findByProps({
      accessibilityLabel: `Expandir navegação, ${label}`,
    });
    expect(tab.props.disabled).toBe(true);
    expect(tab.props.importantForAccessibility).toBe('no-hide-descendants');
  }
  const active = renderer.root.findByProps({
    accessibilityLabel: 'Expandir navegação, Início',
  });
  await act(async () => active.props.onPress());
  expect(expand).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () =>
    renderer.root
      .findByProps({ accessibilityLabel: 'Registrar por voz' })
      .props.onPress(),
  );
  expect(microphone).toHaveBeenCalledTimes(1);
  const frames = renderer.root.findAll(
    node => StyleSheet.flatten(node.props.style)?.width === 54,
  );
  expect(frames.some(node => StyleSheet.flatten(node.props.style)?.pointerEvents === 'none')).toBe(true);
});

test.each([GlassDock, WebGlassDock])(
  'barra separa assistente e voz e mantém a navegação acionável',
  async Dock => {
    const onSelect = jest.fn();
    const onMicrophone = jest.fn();
    const onAssistant = jest.fn();
    await act(async () => {
      renderer = TestRenderer.create(
        <Dock selected="Categories" onSelect={onSelect} onMicrophone={onMicrophone} onAssistant={onAssistant} />,
      );
    });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Categorias' }).props['aria-selected']).toBe(true);
    const tab = renderer.root.findByProps({ accessibilityLabel: 'Extrato' });
    expect(tab.props['aria-selected']).toBe(false);
    await act(async () => tab.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('Statement');
    const assistant = renderer.root.findByProps({ accessibilityLabel: 'Pergunte ao ViKash' });
    expect(assistant.findByType('Icon').props.name).toBe('sparkles');
    expect(assistant.props.accessibilityState?.expanded).toBeUndefined();
    await act(async () => assistant.props.onPress());
    expect(onAssistant).toHaveBeenCalledTimes(1);
    expect(onMicrophone).not.toHaveBeenCalled();
    await act(async () => renderer.root.findByProps({ accessibilityLabel: 'Registrar por voz' }).props.onPress());
    expect(onMicrophone).toHaveBeenCalledTimes(1);
    expect(onAssistant).toHaveBeenCalledTimes(1);
  },
);

test.each([GlassDock, WebGlassDock])(
  'lente compacta cobre toda a superfície circular selecionada',
  async Dock => {
    const context = {
      collapsed: true,
      progress: { get: () => 1 },
      expand: jest.fn(),
    };
    await act(async () => {
      renderer = TestRenderer.create(
        <DockContext.Provider value={context}>
          <Dock selected="AccountManagement" onSelect={jest.fn()} />
        </DockContext.Provider>,
      );
    });
    const layout = renderer.root.findByType(DockLayout).props;
    const rail = StyleSheet.flatten(layout.railStyle);
    const lens = StyleSheet.flatten(layout.lensStyle);
    expect(lens.width).toBe(rail.width);
    expect(rail.width).toBe(54);
    expect(lens.transform[0].translateX).toBe(0);
  },
);

test.each([false, true])(
  'a lente nativa acompanha a seleção mesmo com soltura atrasada ou toques rápidos (movimento reduzido: %s)',
  async reduced => {
    useReducedMotion.mockReturnValue(reduced);
    const sharedValues = [];
    const useSharedValue = Reanimated.useSharedValue;
    jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(initial => {
      const value = useSharedValue(initial);
      if (!sharedValues.includes(value)) {
        sharedValues.push(value);
      }
      return value;
    });
    const onSelect = jest.fn();
    const dock = selected => (
      <GlassDock selected={selected} onSelect={onSelect} />
    );
    await act(async () => {
      renderer = TestRenderer.create(dock('Categories'));
    });
    const position = sharedValues.find(value => value.get() === 3);
    expect(position).toBeDefined();
    const statement = renderer.root.findByProps({
      accessibilityLabel: 'Extrato',
    });
    const releaseStatement = statement.props.onPressOut;
    await act(async () => statement.props.onPressIn());
    expect(position.get()).toBe(3);
    await act(async () => releaseStatement());
    expect(onSelect).not.toHaveBeenCalled();
    expect(position.get()).toBe(3);

    // Pressable solta antes de confirmar; depois pode entregar callbacks antigos.
    await act(async () => statement.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('Statement');
    await act(async () => renderer.update(dock('Statement')));
    await act(async () => releaseStatement());
    expect(position.get()).toBe(1);

    const accounts = renderer.root.findByProps({
      accessibilityLabel: 'Contas',
    });
    const releaseAccounts = accounts.props.onPressOut;
    await act(async () => accounts.props.onPress());
    await act(async () => renderer.update(dock('AccountManagement')));
    const home = renderer.root.findByProps({ accessibilityLabel: 'Início' });
    await act(async () => home.props.onPress());
    await act(async () => renderer.update(dock('Home')));
    await act(async () => {
      releaseAccounts();
      releaseStatement();
    });
    expect(position.get()).toBe(0);
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Início' }).props[
        'aria-selected'
      ],
    ).toBe(true);
  },
);

test('a lente web também mantém a aba confirmada após cancelar e soltar toques antigos', async () => {
  const onSelect = jest.fn();
  const dock = selected => (
    <WebGlassDock selected={selected} onSelect={onSelect} />
  );
  const lensX = () =>
    renderer.root.findByType(DockLayout).props.lensStyle.transform[0]
      .translateX;
  await act(async () => {
    renderer = TestRenderer.create(dock('Categories'));
  });
  const oldX = lensX();
  const statement = renderer.root.findByProps({
    accessibilityLabel: 'Extrato',
  });
  const release = statement.props.onPressOut;
  await act(async () => statement.props.onPressIn());
  expect(lensX()).toBe(oldX);
  await act(async () => release());
  expect(lensX()).toBe(oldX);
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => statement.props.onPress());
  await act(async () => renderer.update(dock('Statement')));
  const newX = lensX();
  expect(newX).toBeLessThan(oldX);
  await act(async () => release());
  expect(lensX()).toBe(newX);
});


test.each([GlassDock, WebGlassDock])('destaque cobre ícone e rótulo tanto aberto quanto recolhido', async Dock => {
  const context = collapsed => ({ collapsed, progress: { get: () => collapsed ? 1 : 0 }, expand: jest.fn() });
  const render = collapsed => <DockContext.Provider value={context(collapsed)}><Dock selected="Categories" onSelect={jest.fn()} /></DockContext.Provider>;
  for (const collapsed of [false, true, false]) {
    await act(async () => {
      if (renderer) { renderer.update(render(collapsed)); }
      else { renderer = TestRenderer.create(render(collapsed)); }
    });
    const { lensStyle, railStyle } = renderer.root.findByType(DockLayout).props;
    const lens = StyleSheet.flatten(lensStyle);
    const rail = StyleSheet.flatten(railStyle);
    expect(lens.height).toBe(collapsed ? 54 : 64);
    expect(lens.width).toBeCloseTo(collapsed ? 54 : (rail.width - 16) / 4);
    expect(lens.transform.find(item => 'translateY' in item).translateY).toBe(collapsed ? 5 : 0);
  }
});


test.each(['Home', 'Statement', 'AccountManagement', 'Categories'])(
  'Android centraliza %s no círculo recolhido mantendo o frame estável',
  async selected => {
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      await act(async () => {
        renderer = TestRenderer.create(
          <DockContext.Provider value={{ collapsed: true, progress: { get: () => 1 }, expand: jest.fn() }}>
            <GlassDock selected={selected} onSelect={jest.fn()} />
          </DockContext.Provider>,
        );
      });
      const frames = renderer.root.findAll(node => node.props['aria-hidden'] === false && node.props.style)
        .map(node => StyleSheet.flatten(node.props.style))
        .filter(style => style?.top === 52 && style.width > 0);
      expect(frames.length).toBeGreaterThan(0);
      const frame = frames[0];
      const lens = StyleSheet.flatten(renderer.root.findByType(DockLayout).props.lensStyle);
      const offset = (style, axis) => style.transform.find(item => axis in item)?.[axis] || 0;
      expect(frame.width / 2 + offset(frame, 'translateX')).toBeCloseTo(lens.width / 2 + offset(lens, 'translateX'));
      expect(frame.height / 2 + offset(frame, 'translateY')).toBeCloseTo(lens.height / 2 + offset(lens, 'translateY'));
      expect(frame.height).toBe(64);
    } finally {
      Platform.OS = original;
    }
  },
);
