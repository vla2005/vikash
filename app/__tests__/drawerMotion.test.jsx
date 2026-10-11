import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, Modal, Text } from 'react-native';
import DrawerModal from '../src/components/DrawerModal';
import DrawerPanel from '../src/components/DrawerPanel';
import useReducedMotion from '../src/hooks/useReducedMotion';
jest.mock('../src/hooks/useReducedMotion', () => jest.fn(() => false));

let renderer;
let exit;
const content = visible => <DrawerModal visible={visible}><DrawerPanel><Text>{visible ? 'Conteúdo aberto' : 'Conteúdo fechado'}</Text></DrawerPanel></DrawerModal>;
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  jest.spyOn(Animated, 'spring').mockReturnValue({ start: jest.fn(), stop: jest.fn() });
  jest.spyOn(Animated, 'timing').mockImplementation(() => ({ start: callback => { exit = callback; }, stop: jest.fn() }));
});
afterEach(async () => { await act(async () => renderer?.unmount()); jest.restoreAllMocks(); });

test('retains modal and content until the whole measured panel has exited', async () => {
  await act(async () => { renderer = TestRenderer.create(content(true)); });
  await act(async () => renderer.root.findByType(DrawerPanel).findAll(node => node.props.onLayout)[0].props.onLayout({ nativeEvent: { layout: { height: 480 } } }));
  await act(async () => renderer.update(content(false)));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(renderer.root.findByType(Text).props.children).toBe('Conteúdo aberto');
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 504 }));
  await act(async () => exit({ finished: true }));
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(renderer.root.findAllByType(DrawerPanel)).toHaveLength(0);
});

test('reopening during exit ignores the old completion and keeps the drawer visible', async () => {
  await act(async () => { renderer = TestRenderer.create(content(true)); });
  await act(async () => renderer.update(content(false)));
  const oldExit = exit;
  await act(async () => renderer.update(content(true)));
  await act(async () => oldExit({ finished: true }));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(renderer.root.findByType(Text).props.children).toBe('Conteúdo aberto');
});

test('reduced motion closes immediately and a hidden drawer does not start an exit', async () => {
  useReducedMotion.mockReturnValue(true);
  await act(async () => { renderer = TestRenderer.create(content(true)); });
  await act(async () => renderer.update(content(false)));
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(Animated.timing).not.toHaveBeenCalled();
});
