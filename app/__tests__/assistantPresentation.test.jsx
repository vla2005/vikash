jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/InstitutionLogo', () => 'InstitutionLogo');
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AssistantRichAnswer from '../src/components/assistant/AssistantRichAnswer';
import PieChart from '../src/shared/components/reacticx/charts/pie-chart';
import { normalizeAssistantPresentation } from '../src/utils/assistantPresentation';
import { validateHistory } from '../src/utils/assistant';
const block = type => ({
  type,
  title: 'Gastos por categoria',
  caption: 'Período consultado',
  value: null,
  format: 'money',
  items: [
    { label: 'Mercado', value: '150.00', formattedValue: 'R$ 150,00' },
    { label: 'Transporte', value: '50.25', formattedValue: 'R$ 50,25' },
  ],
});
const presentation = type => ({
  version: 'financial-presentation-v1',
  blocks: [block(type)],
  queriedAt: '2026-10-16T21:00:00Z',
  limited: false,
});
let renderer;
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  renderer = null;
});
test.each(['pie', 'bar'])(
  'uses the Reacticx %s and shares selection with accessible legend',
  type => {
    act(() => {
      renderer = TestRenderer.create(
        <AssistantRichAnswer
          content={'Você gastou R$ 150,00.\n\nCritério consultado.'}
          presentation={presentation(type)}
        />,
      );
    });
    const root = () =>
      renderer.root.findAll(
        n => n.props.data && typeof n.props.onSelectionChange === 'function',
      )[0];
    expect(root().props.data.map(x => x.value)).toEqual([150, 50.25]);
    const row = renderer.root
      .findAll(n => n.props.accessibilityLabel)
      .find(x => x.props.accessibilityLabel === 'Mercado, R$ 150,00');
    act(() => row.props.onPress());
    expect(root().props.selectedIndex).toBe(0);
    act(() => row.props.onPress());
    expect(root().props.selectedIndex).toBe(-1);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Dados dos seus registros no ViKash',
    );
  },
);
test('preserves exact formatted large values and negative values as lists without unsafe chart geometry', () => {
  const data = presentation('pie');
  data.blocks[0].items[0] = {
    label: 'Ajuste',
    value: '-1.23',
    formattedValue: '-R$ 1,23',
  };
  expect(normalizeAssistantPresentation(data).blocks[0].type).toBe('list');
  act(() => {
    renderer = TestRenderer.create(
      <AssistantRichAnswer content="Ajuste consultado." presentation={data} />,
    );
  });
  expect(renderer.root.findAllByType(PieChart.Root)).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('-R$ 1,23');
});
test('paginates long lists without deleting rows and marks limited results', () => {
  const data = presentation('list');
  data.limited = true;
  data.blocks[0].items = Array.from({ length: 13 }, (_, i) => ({
    label: `Categoria ${i}`,
    value: String(i + 1),
    formattedValue: `Valor ${i + 1}`,
  }));
  act(() => {
    renderer = TestRenderer.create(
      <AssistantRichAnswer content="Resultado limitado." presentation={data} />,
    );
  });
  const next = () =>
    renderer.root
      .findAll(n => n.props.accessibilityLabel)
      .find(x => x.props.accessibilityLabel === 'Próximos itens');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Categoria 12');
  act(() => next().props.onPress());
  act(() => next().props.onPress());
  expect(JSON.stringify(renderer.toJSON())).toContain('Categoria 12');
  expect(next().props.disabled).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).toContain('pode não mostrar todos');
});
test('invalid or future metadata falls back to descriptive text, never executable UI', () => {
  for (const data of [
    { ...presentation('pie'), version: 'future' },
    { ...presentation('html') },
    { ...presentation('pie'), blocks: [] },
  ]) {
    expect(normalizeAssistantPresentation(data)).toBeNull();
  }
  act(() => {
    renderer = TestRenderer.create(
      <AssistantRichAnswer
        content="Texto preservado"
        presentation={{ version: 'future' }}
      />,
    );
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Texto preservado');
});
test('history keeps validated assistant visuals, never user-declared visuals; old text remains valid', () => {
  const history = validateHistory({
    version: 1,
    conversations: [
      {
        id: 'c',
        title: 'Teste',
        messages: [
          {
            id: 'u',
            role: 'user',
            content: 'Pergunta',
            presentation: presentation('pie'),
          },
          {
            id: 'a',
            role: 'assistant',
            content: 'Resposta',
            presentation: presentation('bar'),
          },
          { id: 'old', role: 'assistant', content: 'Texto antigo' },
        ],
      },
    ],
  });
  expect(history[0].messages[0].presentation).toBeUndefined();
  expect(history[0].messages[1].presentation.blocks[0].type).toBe('bar');
  expect(history[0].messages[2].content).toBe('Texto antigo');
});
