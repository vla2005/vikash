jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/InstitutionLogo', () => 'InstitutionLogo');
import React, { Profiler } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Text } from 'react-native';
import { cancelAnimation } from 'react-native-reanimated';
import AssistantReplyText from '../src/components/assistant/AssistantReplyText';
import AssistantThinking from '../src/components/assistant/AssistantThinking';
import AssistantRichAnswer from '../src/components/assistant/AssistantRichAnswer';
import useAssistantAutoScroll from '../src/hooks/useAssistantAutoScroll';
import {
  replyRevealBoundaries,
  replyRevealOffset,
  replyRevealTiming,
} from '../src/utils/assistantReplyMotion';

let renderer;
const textOf = node =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
    ? node.map(textOf).join('')
    : node?.children
    ? textOf(node.children)
    : '';
beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
});
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = null;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('reveals a new reply quickly in bounded batches and preserves all formatting and exact values', () => {
  const content =
    'Seu consumo foi de R$ 1.703,80.\n\nPagamentos de fatura não representam novo consumo. ✨';
  const done = jest.fn();
  act(() => {
    renderer = TestRenderer.create(
      <AssistantReplyText
        content={content}
        animate
        messageId="new"
        onComplete={done}
      />,
    );
  });
  const first = textOf(renderer.toJSON());
  expect(first.length).toBeGreaterThan(0);
  expect(first.length).toBeLessThan(content.length);
  act(() => jest.advanceTimersByTime(120));
  expect(textOf(renderer.toJSON()).length).toBeGreaterThan(first.length);
  act(() => jest.advanceTimersByTime(1800));
  expect(textOf(renderer.toJSON())).toBe(content.replace('\n\n', ''));
  expect(done).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledWith('new');
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.selectable === true),
  ).toBe(true);
});

test('old messages render completely without timers or replay', () => {
  const done = jest.fn(),
    content = 'Resposta salva no histórico: R$ 25,30.';
  act(() => {
    renderer = TestRenderer.create(
      <AssistantReplyText content={content} onComplete={done} />,
    );
  });
  expect(textOf(renderer.toJSON())).toBe(content);
  expect(jest.getTimerCount()).toBe(0);
  expect(done).not.toHaveBeenCalled();
});

test('unmount cancels reveal and background finishes once without starting another clock', () => {
  let onState;
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((type, listener) => {
      onState = listener;
      return { remove };
    });
  const content = 'Uma resposta longa para a revelação progressiva. '.repeat(
      20,
    ),
    done = jest.fn();
  act(() => {
    renderer = TestRenderer.create(
      <AssistantReplyText
        content={content}
        animate
        messageId="a"
        onComplete={done}
      />,
    );
  });
  act(() => onState('background'));
  expect(done).toHaveBeenCalledTimes(1);
  expect(textOf(renderer.toJSON())).toBe(content);
  expect(jest.getTimerCount()).toBe(0);
  act(() => onState('active'));
  act(() => jest.advanceTimersByTime(2000));
  expect(done).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
  renderer = null;
  expect(remove).toHaveBeenCalled();
  act(() => {
    renderer = TestRenderer.create(
      <AssistantReplyText
        content={content}
        animate
        messageId="b"
        onComplete={done}
      />,
    );
  });
  act(() => renderer.unmount());
  renderer = null;
  expect(jest.getTimerCount()).toBe(0);
  expect(done).toHaveBeenCalledTimes(1);
});

test('long replies have a fixed render budget; charts and ancestor do not rerender on each chunk', () => {
  const parentCommit = jest.fn(),
    replyCommit = jest.fn(),
    done = jest.fn();
  const content =
    'Esta resposta inclui valores financeiros exatos e explicações. '.repeat(
      100,
    );
  const presentation = {
    version: 'financial-presentation-v1',
    queriedAt: '',
    limited: false,
    blocks: [
      {
        type: 'metric',
        title: 'Consumo',
        caption: 'Consulta atual',
        value: 'R$ 200,00',
        format: 'money',
        items: [],
      },
    ],
  };
  function Parent() {
    parentCommit();
    return (
      <Profiler id="reply" onRender={replyCommit}>
        <AssistantRichAnswer
          content={content}
          presentation={presentation}
          animate
          messageId="long"
          onRevealComplete={done}
        />
      </Profiler>
    );
  }
  act(() => {
    renderer = TestRenderer.create(<Parent />);
  });
  for (let i = 0; i < 50; i++) act(() => jest.advanceTimersByTime(40));
  expect(parentCommit).toHaveBeenCalledTimes(1);
  expect(replyCommit.mock.calls.length).toBeLessThanOrEqual(48);
  expect(textOf(renderer.toJSON())).toContain(content);
  expect(done).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findAllByProps({ testID: 'assistant-metric' }).length,
  ).toBeGreaterThan(0);
});

test('chunk boundaries preserve Unicode surrogate pairs and maximum duration is bounded', () => {
  const content = 'Olá 👋🏽! Gastos 💸 R$ 2,50.';
  const points = replyRevealBoundaries(content);
  for (let step = 0; step <= 50; step++) {
    const prefix = content.slice(0, replyRevealOffset(points, step / 50));
    expect(prefix).not.toMatch(/[\uD800-\uDBFF]$/);
  }
  expect(replyRevealTiming('a'.repeat(10000))).toEqual({
    duration: 1800,
    steps: 45,
  });
});

test('thinking is an accessible three-line skeleton and stops its UI animation on hide', () => {
  act(() => {
    renderer = TestRenderer.create(<AssistantThinking />);
  });
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'ViKash está preparando a resposta',
    }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({ testID: 'assistant-thinking-skeleton' })
      .length,
  ).toBeGreaterThan(0);
  expect(jest.getTimerCount()).toBe(0);
  const before = cancelAnimation.mock.calls.length;
  act(() => renderer.update(<AssistantThinking active={false} />));
  expect(cancelAnimation.mock.calls.length).toBeGreaterThan(before);
});

test('scroll follows at most once per batch, releases when reading history and cleans up on hide', () => {
  const list = { current: { scrollToEnd: jest.fn() } };
  let scroll;
  function Probe({ active = true }) {
    scroll = useAssistantAutoScroll(list, active, 'conversation', 'user');
    return null;
  }
  act(() => {
    renderer = TestRenderer.create(<Probe />);
  });
  act(() => jest.advanceTimersByTime(100));
  list.current.scrollToEnd.mockClear();
  act(() => {
    for (let i = 0; i < 20; i++) scroll.onContentSizeChange();
  });
  act(() => jest.advanceTimersByTime(100));
  expect(list.current.scrollToEnd).toHaveBeenCalledTimes(1);
  expect(list.current.scrollToEnd).toHaveBeenLastCalledWith({
    animated: false,
  });
  const event = y => ({
    nativeEvent: {
      contentOffset: { y },
      contentSize: { height: 1500 },
      layoutMeasurement: { height: 500 },
    },
  });
  act(() => {
    scroll.onScroll(event(1000));
    scroll.onScroll(event(700));
    scroll.onContentSizeChange();
  });
  act(() => jest.advanceTimersByTime(200));
  expect(list.current.scrollToEnd).toHaveBeenCalledTimes(1);
  act(() => {
    scroll.onScroll(event(1000));
    scroll.onContentSizeChange();
  });
  act(() => renderer.update(<Probe active={false} />));
  act(() => jest.advanceTimersByTime(200));
  expect(list.current.scrollToEnd).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
