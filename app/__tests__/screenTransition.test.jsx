import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import ScreenTransition from '../src/components/ScreenTransition';
import useReducedMotion from '../src/hooks/useReducedMotion';

jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn(() => false) }));

let renderer; let timing; let stop;
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  stop = jest.fn();
  timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn() });
  jest.spyOn(Animated, 'parallel').mockReturnValue({ start: jest.fn(), stop });
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
const motion = () => renderer.root.findAll(node => node.props.testID === 'screen-transition' && Array.isArray(node.props.style))[0].props.style[1];
const render = props => act(() => { renderer = TestRenderer.create(<ScreenTransition {...props}><Text>Tela</Text></ScreenTransition>); });
const update = props => act(() => renderer.update(<ScreenTransition {...props}><Text>Tela</Text></ScreenTransition>));

test('tab changes move in navigation order, interrupt previous movement and do not animate data updates', () => {
  render({ sceneKey: 'Home', order: 0 });
  expect(timing).not.toHaveBeenCalled();
  update({ sceneKey: 'Home', order: 0 });
  expect(timing).not.toHaveBeenCalled();
  update({ sceneKey: 'Accounts', order: 2 });
  expect(motion().transform[0].translateX.__getValue()).toBe(32);
  expect(motion().opacity.__getValue()).toBe(0);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 360, useNativeDriver: true }));
  update({ sceneKey: 'Home', order: 0 });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(motion().transform[0].translateX.__getValue()).toBe(-32);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 280 }));
});

test('details enter from the right and return in the opposite direction without remounting persistent children', () => {
  const mounted = jest.fn(); const unmounted = jest.fn();
  function Content() { useEffect(() => { mounted(); return unmounted; }, []); return <Text>Conteúdo</Text>; }
  act(() => { renderer = TestRenderer.create(<ScreenTransition sceneKey="accounts"><Content /></ScreenTransition>); });
  act(() => renderer.update(<ScreenTransition sceneKey="account:1" depth={1}><Content /></ScreenTransition>));
  expect(motion().transform[0].translateX.__getValue()).toBe(64);
  act(() => renderer.update(<ScreenTransition sceneKey="accounts"><Content /></ScreenTransition>));
  expect(motion().transform[0].translateX.__getValue()).toBe(-64);
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
});

test('reduced motion cancels an active transition and renders the latest screen fully visible', () => {
  render({ sceneKey: 'Home' });
  update({ sceneKey: 'Profile', depth: 1 });
  timing.mockClear();
  useReducedMotion.mockReturnValue(true);
  update({ sceneKey: 'Profile', depth: 1 });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(motion().opacity.__getValue()).toBe(1);
  expect(motion().transform[0].translateX.__getValue()).toBe(0);
  update({ sceneKey: 'EditProfile', depth: 2 });
  expect(timing).not.toHaveBeenCalled();
});

test('authentication reset uses fade and unmounting cancels pending animations', () => {
  render({ sceneKey: 'Register', depth: 1 });
  update({ sceneKey: 'Login', fade: true });
  expect(motion().transform[0].translateX.__getValue()).toBe(0);
  expect(motion().opacity.__getValue()).toBe(0);
  act(() => renderer.unmount()); renderer = null;
  expect(stop).toHaveBeenCalledTimes(1);
});
