import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as motion from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import VoiceComposer from '../src/components/VoiceComposer';
import VoiceComposerWeb from '../src/components/VoiceComposer.web';
import { voiceOrb } from '../src/theme/silver';
// DOM-like host lets this test exercise the real web transition listener.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const ReactMock = require('react');
  return Object.create(actual, {
    View: {
      value: ReactMock.forwardRef((props, ref) =>
        ReactMock.createElement('View', { ...props, ref }),
      ),
    },
  });
});
let renderer;
const defaults = {
  expanded: false,
  visible: true,
  value: '',
  sending: false,
  confirmLabel: 'Confirmar e analisar',
  inputRef: { current: null },
  microphone: <View testID="test-microphone" />,
  restartControl: <View />,
  cancelControl: <View />,
};
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});
function shell() {
  return renderer.root.findAllByProps({ testID: 'voice-keyboard-shell' })[0];
}
test('expansão nativa usa animação UI e só pede foco quando conclui', async () => {
  const pending = [];
  const timing = jest
    .spyOn(motion, 'withTiming')
    .mockImplementation((value, config, callback) => {
      if (callback) {
        pending.push(callback);
      }
      return value;
    });
  const ready = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <VoiceComposer {...defaults} onExpanded={ready} />,
    );
  });
  const original = shell();
  await act(async () =>
    renderer.update(
      <VoiceComposer {...defaults} expanded onExpanded={ready} />,
    ),
  );
  expect(shell()).toBe(original);
  expect(timing).toHaveBeenCalledWith(
    1,
    expect.objectContaining({
      duration: voiceOrb.composer.duration,
      reduceMotion: 'never',
    }),
    expect.any(Function),
  );
  expect(ready).not.toHaveBeenCalled();
  await act(async () => pending.at(-1)(true));
  expect(ready).toHaveBeenCalledTimes(1);
  await act(async () =>
    renderer.update(<VoiceComposer {...defaults} onExpanded={ready} />),
  );
  await act(async () => pending.at(-1)(false));
  expect(ready).toHaveBeenCalledTimes(1);
  expect(motion.cancelAnimation).toHaveBeenCalled();
});
test('web anima o mesmo elemento e só foca após a largura terminar de expandir', async () => {
  const ready = jest.fn();
  const node = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
  await act(async () => {
    renderer = TestRenderer.create(
      <VoiceComposerWeb {...defaults} onExpanded={ready} />,
      {
        createNodeMock: element =>
          element.props.testID === 'voice-keyboard-shell' ? node : null,
      },
    );
  });
  const listener = node.addEventListener.mock.calls.find(
    call => call[0] === 'transitionend',
  )[1];
  const original = shell();
  await act(async () =>
    renderer.update(
      <VoiceComposerWeb {...defaults} expanded onExpanded={ready} />,
    ),
  );
  expect(shell()).toBe(original);
  await act(async () => listener({ target: node, propertyName: 'height' }));
  expect(ready).not.toHaveBeenCalled();
  await act(async () => listener({ target: node, propertyName: 'width' }));
  expect(ready).toHaveBeenCalledTimes(1);
  const styles = shell().props.style.flat();
  expect(
    styles.some(style => style?.transitionProperty?.includes('width')),
  ).toBe(true);
  await act(async () =>
    renderer.update(<VoiceComposerWeb {...defaults} onExpanded={ready} />),
  );
  await act(async () => listener({ target: node, propertyName: 'width' }));
  expect(ready).toHaveBeenCalledTimes(1);
});


test('o mesmo microfone fica menor abaixo do input e cresce ao voltar com os controles laterais', async () => {
  await act(async () => { renderer = TestRenderer.create(<VoiceComposerWeb {...defaults} />); });
  const mic = renderer.root.findAllByProps({ testID: 'test-microphone' })[0];
  const node = id => renderer.root.findAllByProps({ testID: id })[0];
  const style = id => StyleSheet.flatten(node(id).props.style);
  expect(style('voice-microphone-motion').transform).toEqual([{ scale: 1 }]);
  await act(async () => renderer.update(<VoiceComposerWeb {...defaults} expanded />));
  expect(renderer.root.findAllByProps({ testID: 'test-microphone' })[0]).toBe(mic);
  expect(style('voice-microphone-motion').transform[0].scale).toBeCloseTo(44 / 72);
  expect(style('voice-microphone-controls').transform).toEqual([{ translateY: 90 }]);
  expect(node('voice-restart-control').props['aria-hidden']).toBe(true);
  expect(style('voice-restart-control').opacity).toBe(0);
  expect(node('voice-cancel-control').props['aria-hidden']).toBe(true);
  await act(async () => renderer.update(<VoiceComposerWeb {...defaults} />));
  expect(renderer.root.findAllByProps({ testID: 'test-microphone' })[0]).toBe(mic);
  expect(style('voice-microphone-motion').transform).toEqual([{ scale: 1 }]);
  expect(style('voice-microphone-controls').transform).toEqual([{ translateY: 0 }]);
  expect(style('voice-cancel-control').opacity).toBe(1);
  expect(node('voice-restart-control').props['aria-hidden']).toBe(false);
});
