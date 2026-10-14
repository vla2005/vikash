import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal, Platform, Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import DrawerModal from '../src/components/DrawerModal';
import DrawerPanel from '../src/components/DrawerPanel';
import useReducedMotion from '../src/hooks/useReducedMotion';
jest.mock('../src/hooks/useReducedMotion', () => jest.fn(() => false));

let renderer;
let exit;
const content = visible => (
  <DrawerModal visible={visible}>
    <DrawerPanel>
      <Text>{visible ? 'Conteúdo aberto' : 'Conteúdo fechado'}</Text>
    </DrawerPanel>
  </DrawerModal>
);
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  Reanimated.cancelAnimation.mockClear();
  jest
    .spyOn(Reanimated, 'withTiming')
    .mockImplementation((target, config, complete) => {
      if (complete) {
        exit = complete;
      }
      return target;
    });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  jest.restoreAllMocks();
});

test('retains modal and content until the whole measured panel has exited', async () => {
  await act(async () => {
    renderer = TestRenderer.create(content(true));
  });
  await act(async () =>
    renderer.root
      .findByType(DrawerPanel)
      .findAll(node => node.props.onLayout)[0]
      .props.onLayout({ nativeEvent: { layout: { height: 480 } } }),
  );
  await act(async () => renderer.update(content(false)));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(renderer.root.findByType(Text).props.children).toBe('Conteúdo aberto');
  expect(Reanimated.withTiming).toHaveBeenCalledWith(
    504,
    expect.objectContaining({ duration: 260 }),
    expect.any(Function),
  );
  await act(async () => exit(true));
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(renderer.root.findAllByType(DrawerPanel)).toHaveLength(0);
});

test('reopening during exit ignores the old completion and keeps the drawer visible', async () => {
  await act(async () => {
    renderer = TestRenderer.create(content(true));
  });
  await act(async () => renderer.update(content(false)));
  const oldExit = exit;
  await act(async () => renderer.update(content(true)));
  await act(async () => oldExit(true));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(renderer.root.findByType(Text).props.children).toBe('Conteúdo aberto');
});

test('reduced motion closes immediately and a hidden drawer does not start an exit', async () => {
  useReducedMotion.mockReturnValue(true);
  await act(async () => {
    renderer = TestRenderer.create(content(true));
  });
  await act(async () => renderer.update(content(false)));
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(Reanimated.withTiming).not.toHaveBeenCalled();
});

const measure = async height =>
  act(async () =>
    renderer.root
      .findByType(DrawerPanel)
      .findAll(node => node.props.onLayout)[0]
      .props.onLayout({ nativeEvent: { layout: { height } } }),
  );
const show = async () =>
  act(async () => renderer.root.findByType(Modal).props.onShow());

test('starts outside the measured panel and enters only once after layout and native onShow', async () => {
  await act(async () => {
    renderer = TestRenderer.create(content(true));
  });
  expect(Reanimated.withTiming).not.toHaveBeenCalled();
  await measure(844);
  expect(Reanimated.cancelAnimation.mock.calls.at(-1)[0].get()).toBe(868);
  expect(Reanimated.withTiming).not.toHaveBeenCalled();
  await show();
  expect(Reanimated.withTiming).toHaveBeenCalledTimes(1);
  expect(Reanimated.withTiming).toHaveBeenCalledWith(
    0,
    expect.objectContaining({ duration: 300, reduceMotion: 'never' }),
  );
  await measure(844);
  await act(async () => renderer.update(content(true)));
  expect(Reanimated.withTiming).toHaveBeenCalledTimes(1);
});

test('opening a previously hidden modal waits for layout and does not restart when present updates', async () => {
  await act(async () => {
    renderer = TestRenderer.create(content(false));
  });
  await act(async () => renderer.update(content(true)));
  expect(Reanimated.withTiming).not.toHaveBeenCalled();
  await show();
  expect(Reanimated.withTiming).not.toHaveBeenCalled();
  await measure(520);
  expect(Reanimated.withTiming).toHaveBeenCalledTimes(1);
  await show();
  expect(Reanimated.withTiming).toHaveBeenCalledTimes(1);
});

test('reverses an exit without resetting the panel or waiting for another onShow', async () => {
  await act(async () => {
    renderer = TestRenderer.create(content(true));
  });
  await measure(480);
  await show();
  await act(async () => renderer.update(content(false)));
  const oldExit = exit;
  Reanimated.cancelAnimation.mockClear();
  await act(async () => renderer.update(content(true)));
  expect(Reanimated.withTiming).toHaveBeenLastCalledWith(
    0,
    expect.objectContaining({ duration: 300 }),
  );
  await act(async () => oldExit(true));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
});

test('preserves consumer onShow callbacks and cancels pending entry when closed before measurement', async () => {
  const onShow = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <DrawerModal visible onShow={onShow}>
        <DrawerPanel>
          <Text>Focus</Text>
        </DrawerPanel>
      </DrawerModal>,
    );
  });
  await show();
  expect(onShow).toHaveBeenCalledTimes(1);
  await act(async () => renderer.update(content(false)));
  await measure(480);
  expect(
    Reanimated.withTiming.mock.calls.filter(([target]) => target === 0),
  ).toHaveLength(0);
});


test.each([
  ['android', false, true],
  ['android', true, false],
  ['ios', false, false],
])('%s mantém cache temporário apenas no painel estático (tela inteira: %s)', async (os, fullScreen, cached) => {
  jest.replaceProperty(Platform, 'OS', os);
  let layer;
  jest.spyOn(Reanimated, 'useAnimatedProps').mockImplementation(factory => {
    layer = factory;
    return factory();
  });
  const drawer = visible => <DrawerModal visible={visible}><DrawerPanel fullScreen={fullScreen}><Text>Painel</Text></DrawerPanel></DrawerModal>;
  await act(async () => { renderer = TestRenderer.create(drawer(true)); });
  await measure(480);
  expect(layer().renderToHardwareTextureAndroid).toBe(cached);
  await show();
  expect(layer().renderToHardwareTextureAndroid).toBe(false);
  await act(async () => renderer.update(drawer(false)));
  expect(layer().renderToHardwareTextureAndroid).toBe(cached);
  await act(async () => exit(true));
  expect(renderer.root.findAllByType(DrawerPanel)).toHaveLength(0);
});


test('drawer ainda fechado não inicializa a ponte de animação; a primeira abertura cria só uma', async () => {
  const sharedValue = jest.spyOn(Reanimated, 'useSharedValue');
  await act(async () => { renderer = TestRenderer.create(content(false)); });
  expect(sharedValue).not.toHaveBeenCalled();
  await act(async () => renderer.update(content(true)));
  expect(sharedValue).toHaveBeenCalledTimes(1);
  await measure(480);
  await show();
  await act(async () => renderer.update(content(false)));
  await act(async () => exit(true));
  await act(async () => renderer.update(content(true)));
  expect(sharedValue.mock.results.every(result => result.value === sharedValue.mock.results[0].value)).toBe(true);
});
