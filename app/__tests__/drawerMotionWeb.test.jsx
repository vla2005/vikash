import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View } from 'react-native';
import useDrawerAnimation from '../src/hooks/useDrawerAnimation.web';

let controller;
let renderer;
let frames;
let nextId;
function Harness() {
  controller = useDrawerAnimation(868);
  return <View style={controller.panelStyle} />;
}
async function frame() {
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  await act(async () => callback(16));
}
beforeEach(async () => {
  jest.useFakeTimers();
  frames = new Map();
  nextId = 0;
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextId, callback);
    return nextId;
  });
  jest
    .spyOn(global, 'cancelAnimationFrame')
    .mockImplementation(id => frames.delete(id));
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
  });
});
afterEach(async () => {
  controller.stop();
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('paints the measured offset before starting the CSS entry', async () => {
  await act(async () => {
    controller.prepare(504);
    controller.enter(true);
  });
  expect(controller.panelStyle.transform).toEqual([{ translateY: 504 }]);
  expect(controller.panelStyle.transitionDuration).toBe('0ms');
  await frame();
  expect(controller.panelStyle.transform).toEqual([{ translateY: 504 }]);
  await frame();
  expect(controller.panelStyle.transform).toEqual([{ translateY: 0 }]);
  expect(controller.panelStyle.transitionDuration).toBe('300ms');
});

test('starts the exit clock after the CSS target is committed and cancels it when reopening', async () => {
  const complete = jest.fn();
  await act(async () => controller.exit(504, complete));
  await act(async () => jest.advanceTimersByTime(260));
  expect(complete).not.toHaveBeenCalled();
  await frame();
  await act(async () => controller.enter(false));
  await act(async () => jest.advanceTimersByTime(300));
  expect(complete).not.toHaveBeenCalled();
  expect(controller.panelStyle.transform).toEqual([{ translateY: 0 }]);
});

test('completes the exit after 260ms and releases a delayed entry on cancellation', async () => {
  const complete = jest.fn();
  await act(async () => controller.exit(504, complete));
  await frame();
  await act(async () => jest.advanceTimersByTime(259));
  expect(complete).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(complete).toHaveBeenCalledTimes(1);
  await act(async () => {
    controller.prepare(868);
    controller.enter(true);
    controller.stop();
  });
  expect(frames.size).toBe(0);
  expect(controller.panelStyle.transform).toEqual([{ translateY: 868 }]);
});
