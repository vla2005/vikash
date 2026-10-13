import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import DockScrollView from '../src/components/silver/DockScrollView';
import { DockContext } from '../src/contexts/DockContext';

let renderer;
const event = (y, height = 1600) => ({
  contentOffset: { y },
  contentSize: { height },
  layoutMeasurement: { height: 400 },
});
const scroll = (...args) =>
  renderer.root
    .findAll(node => typeof node.props.onScroll === 'function')[0]
    .props.onScroll(event(...args));
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
});

test('rolagem continua compactando e expandindo sem publicar o mesmo alvo a cada frame', async () => {
  let value = 0;
  const target = {
    get: () => value,
    set: jest.fn(next => {
      value = next;
    }),
  };
  await act(async () => {
    renderer = TestRenderer.create(
      <DockContext.Provider value={{ target }}>
        <DockScrollView />
      </DockContext.Provider>,
    );
  });
  await act(async () => {
    for (let y = 0; y <= 220; y += 4) {
      scroll(y);
    }
  });
  expect(target.set.mock.calls).toEqual([[1]]);
  await act(async () => {
    for (let y = 220; y >= 160; y -= 4) {
      scroll(y);
    }
  });
  expect(target.set.mock.calls).toEqual([[1], [0]]);
});

test('a paginação continua chamando uma vez por altura e aceita a próxima página', async () => {
  const onReachEnd = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(<DockScrollView onReachEnd={onReachEnd} />);
  });
  await act(async () => {
    scroll(600);
    scroll(970);
    scroll(980);
    scroll(1000);
  });
  expect(onReachEnd).toHaveBeenCalledTimes(1);
  await act(async () => {
    scroll(980, 2000);
    scroll(1380, 2000);
    scroll(1400, 2000);
  });
  expect(onReachEnd).toHaveBeenCalledTimes(2);
});
