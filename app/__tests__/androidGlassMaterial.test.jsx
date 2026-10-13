import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import GlassMaterial from '../src/components/silver/GlassMaterial.jsx';
import DockLayout from '../src/components/silver/DockLayout';
import { DockContext } from '../src/contexts/DockContext';
import useReducedTransparency from '../src/hooks/useReducedTransparency';

// O preset do Jest resolve .ios por padrão, mesmo após mudar Platform.OS.
jest.mock('../src/components/silver/GlassMaterial', () =>
  jest.requireActual('../src/components/silver/GlassMaterial.jsx'),
);
jest.mock('../src/hooks/useReducedTransparency', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let renderer;
const blurs = () =>
  renderer.root.findAll(
    node => node.type === BlurView && node.props.blurMethod,
  );
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  useReducedTransparency.mockReturnValue(false);
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});

test('Android mantém vidro nas três superfícies e usa a barra como fundo da lente', async () => {
  const blurTarget = { current: null };
  const content = (
    <DockContext.Provider value={{ blurTarget }}>
      <DockLayout renderTab={() => null} />
    </DockContext.Provider>
  );
  await act(async () => {
    renderer = TestRenderer.create(content);
  });
  expect(blurs()).toHaveLength(3);
  expect(blurs().every(node => node.props.blurTarget === blurTarget)).toBe(
    true,
  );
  expect(
    renderer.root
      .findByProps({ lens: true })
      .findAll(node => node.props.blurMethod),
  ).toHaveLength(0);
  useReducedTransparency.mockReturnValue(true);
  await act(async () =>
    renderer.update(
      <DockContext.Provider value={{ blurTarget }}>
        <DockLayout renderTab={() => null} />
      </DockContext.Provider>,
    ),
  );
  expect(blurs()).toHaveLength(0);
});

test('Android não monta desfoque sem uma área de captura disponível', async () => {
  await act(async () => {
    renderer = TestRenderer.create(<GlassMaterial />);
  });
  expect(blurs()).toHaveLength(0);
});
