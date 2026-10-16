import React, { createRef } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, TextInput } from 'react-native';
import AnimatedInputBar from '../src/shared/components/reacticx/base/animated-input-bar';
let renderer;
let state;
const placeholders = ['Primeiro exemplo', 'Segundo exemplo'];
function propsOfInput() {
  return renderer.root.findByType(TextInput).props;
}
function characters() {
  return renderer.root
    .findAll(
      node => node.type === 'Text' && typeof node.props.children === 'string',
    )
    .map(node => node.props.children)
    .join('');
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    state = callback;
    return { remove: jest.fn() };
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('valor controlado acompanha limpeza externa e preserva eventos de foco', async () => {
  const focus = jest.fn(),
    blur = jest.fn(),
    change = jest.fn(),
    ref = createRef();
  await act(async () => {
    renderer = TestRenderer.create(
      <AnimatedInputBar
        ref={ref}
        placeholders={placeholders}
        value="Texto"
        onChangeText={change}
        onFocus={focus}
        onBlur={blur}
      />,
    );
  });
  expect(propsOfInput().value).toBe('Texto');
  await act(async () => propsOfInput().onChangeText('Editado'));
  expect(change).toHaveBeenCalledWith('Editado');
  await act(async () =>
    renderer.update(
      <AnimatedInputBar
        placeholders={placeholders}
        value=""
        onFocus={focus}
        onBlur={blur}
      />,
    ),
  );
  expect(propsOfInput().value).toBe('');
  await act(async () => propsOfInput().onFocus({}));
  expect(focus).toHaveBeenCalled();
  expect(propsOfInput().placeholder).toBe(placeholders[0]);
  expect(characters()).toBe('');
  await act(async () => propsOfInput().onBlur({}));
  expect(blur).toHaveBeenCalled();
});
test('placeholders giram só enquanto o input está vazio, sem foco, ativo e em primeiro plano', async () => {
  const timers = jest.spyOn(global, 'setTimeout');
  const clear = jest.spyOn(global, 'clearTimeout');
  const rotations = () =>
    timers.mock.calls.filter(call => call[1] === 1000).length;
  const currentTimer = () => {
    const index = timers.mock.calls.map(call => call[1]).lastIndexOf(1000);
    return timers.mock.results[index].value;
  };
  await act(async () => {
    renderer = TestRenderer.create(
      <AnimatedInputBar
        placeholders={placeholders}
        animationInterval={1000}
        value=""
      />,
    );
  });
  expect(characters()).toBe(placeholders[0]);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(characters()).toBe(placeholders[1]);
  const focusedTimer = currentTimer();
  await act(async () => propsOfInput().onFocus({}));
  expect(clear).toHaveBeenCalledWith(focusedTimer);
  expect(characters()).toBe('');
  await act(async () => propsOfInput().onBlur({}));
  const backgroundTimer = currentTimer();
  await act(async () => state('background'));
  expect(clear).toHaveBeenCalledWith(backgroundTimer);
  const beforeResume = rotations();
  await act(async () => state('active'));
  expect(rotations()).toBe(beforeResume + 1);
  const inactiveTimer = currentTimer();
  await act(async () =>
    renderer.update(
      <AnimatedInputBar active={false} placeholders={placeholders} value="" />,
    ),
  );
  expect(clear).toHaveBeenCalledWith(inactiveTimer);
  const beforeTyping = rotations();
  await act(async () =>
    renderer.update(
      <AnimatedInputBar placeholders={placeholders} value="Digitando" />,
    ),
  );
  expect(rotations()).toBe(beforeTyping);
  expect(characters()).toBe('');
});

test('startup mode uses one text node, retains the placeholder and restores characters after focus', async () => {
  const textNodes=()=>renderer.root.findAll(node=>node.type==='Text' && typeof node.props.children==='string');
  await act(async()=>{renderer=TestRenderer.create(<AnimatedInputBar placeholders={placeholders} value="" animatePlaceholder={false}/>);});
  expect(characters()).toBe(placeholders[0]);
  expect(textNodes()).toHaveLength(1);
  await act(async()=>jest.advanceTimersByTime(5000));
  expect(characters()).toBe(placeholders[0]);
  await act(async()=>propsOfInput().onFocus({}));
  await act(async()=>renderer.update(<AnimatedInputBar placeholders={placeholders} value="" animatePlaceholder/>));
  expect(characters()).toBe('');
  expect(propsOfInput().placeholder).toBe(placeholders[0]);
  await act(async()=>propsOfInput().onBlur({}));
  expect(textNodes()).toHaveLength(placeholders[0].length);
});
