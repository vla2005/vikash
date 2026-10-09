import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, Image } from 'react-native';
import AnimatedSplash from '../src/components/AnimatedSplash';
import useReducedMotion from '../src/hooks/useReducedMotion';
import { hideNativeSplash } from '../src/services/nativeSplash';

jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../src/services/nativeSplash', () => ({ hideNativeSplash: jest.fn(() => Promise.resolve()) }));

let renderer;
let intro;
let fade;

beforeEach(() => {
  jest.clearAllMocks();
  useReducedMotion.mockReturnValue(false);
  intro = { start: jest.fn(), stop: jest.fn() };
  jest.spyOn(Animated, 'parallel').mockReturnValue(intro);
  jest.spyOn(Animated, 'timing').mockImplementation(() => {
    const animation = { start: jest.fn(), stop: jest.fn() };
    fade = animation;
    return animation;
  });
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  jest.restoreAllMocks();
});

async function showBrand() {
  await act(async () => renderer.root.findByProps({ testID: 'animated-splash' }).props.onLayout());
  await act(async () => renderer.root.findByType(Image).props.onLoadEnd());
}

test('mantém a splash nativa até a imagem e o layout estarem prontos', async () => {
  await act(async () => { renderer = TestRenderer.create(<AnimatedSplash ready={false} onFinish={jest.fn()} />); });
  await act(async () => renderer.root.findByProps({ testID: 'animated-splash' }).props.onLayout());
  expect(hideNativeSplash).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(Image).props.onLoadEnd());
  expect(hideNativeSplash).toHaveBeenCalledTimes(1);
  expect(intro.start).not.toHaveBeenCalled();
});

test('espera a inicialização, completa a entrada e só então libera o app', async () => {
  const onFinish = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AnimatedSplash ready={false} onFinish={onFinish} />); });
  await showBrand();
  expect(onFinish).not.toHaveBeenCalled();
  await act(async () => renderer.update(<AnimatedSplash ready onFinish={onFinish} />));
  expect(intro.start).toHaveBeenCalledTimes(1);
  await act(async () => intro.start.mock.calls[0][0]({ finished: true }));
  expect(onFinish).not.toHaveBeenCalled();
  expect(fade.start).toHaveBeenCalledTimes(1);
  await act(async () => fade.start.mock.calls[0][0]({ finished: true }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test('movimento reduzido evita a escala e libera o app sem espera pela animação', async () => {
  useReducedMotion.mockReturnValue(true);
  const onFinish = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AnimatedSplash ready onFinish={onFinish} />); });
  await showBrand();
  expect(Animated.parallel).not.toHaveBeenCalled();
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 0 }));
  await act(async () => fade.start.mock.calls[0][0]({ finished: true }));
  expect(onFinish).toHaveBeenCalledTimes(1);
});

test('interrompe a animação ao desmontar sem concluir uma abertura cancelada', async () => {
  const onFinish = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AnimatedSplash ready onFinish={onFinish} />); });
  await showBrand();
  await act(async () => renderer.unmount());
  renderer = undefined;
  expect(intro.stop).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});
