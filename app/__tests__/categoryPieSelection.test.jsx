import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import * as Motion from 'react-native-reanimated';
import CategoryExpensesChart from '../src/components/CategoryExpensesChart';
import CategoryDonut from '../src/components/CategoryDonut';
import PieChart from '../src/shared/components/reacticx/charts/pie-chart';
import PieChartWeb from '../src/shared/components/reacticx/charts/pie-chart/index.web';
import {
  hitSlice,
  plotGeometry,
} from '../src/shared/components/reacticx/charts/pie-chart/interaction';
import { formatCurrency } from '../src/utils/money';
jest.mock('react-native-svg', () => jest.requireActual('../src/web/svg'));
const categories = [
  { customCategoryUuid: 'a', name: 'Moradia', total: 1450, color: 'blue' },
  { customCategoryUuid: 'b', name: 'Alimentação', total: 620, color: 'sage' },
  { customCategoryUuid: 'c', name: 'Transporte', total: 340, color: 'ochre' },
];
let renderer;
const value = id =>
  renderer.root.findAllByProps({ testID: id })[0].props.children;
const donut = () => renderer.root.findByType(CategoryDonut.type);
const legend = name =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel?.startsWith(name + ':'),
  )[0];
async function open(props = {}) {
  await act(async () => {
    renderer = TestRenderer.create(
      <CategoryExpensesChart
        categories={categories}
        periodLabel="Outubro de 2026"
        {...props}
      />,
    );
  });
}
async function measure() {
  await act(async () =>
    renderer.root
      .findAll(node => typeof node.props.onLayout === 'function')[0]
      .props.onLayout({ nativeEvent: { layout: { width: 280, height: 280 } } }),
  );
}
const tap = (x, y) =>
  act(async () =>
    renderer.root
      .findAllByProps({ testID: 'pie-chart-touch' })[0]
      .props.onPress({ nativeEvent: { locationX: x, locationY: y } }),
  );
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
});
test('toque real na fatia destaca legenda, troca valor/nome e centro mostra participação', async () => {
  await open();
  await measure();
  const root = renderer.root.findByType(PieChart.Root.type),
    data = root.props.data;
  expect(value('category-spending-value')).toBe(formatCurrency(2410));
  expect(value('category-spending-share')).toBe('100%');
  await tap(40, 180);
  expect(donut().props.selectedIndex).toBe(1);
  expect(value('category-spending-value')).toBe(formatCurrency(620));
  expect(value('category-spending-name')).toBe('Alimentação');
  expect(value('category-spending-share')).toBe('25,7%');
  expect(legend('Alimentação').props.accessibilityState.selected).toBe(true);
  expect(legend('Moradia').props.accessibilityState.selected).toBe(false);
  expect(renderer.root.findByType(PieChart.Root.type)).toBe(root);
  expect(root.props.data).toBe(data);
});
test('seleção persiste após o toque; repetir categoria ou tocar no centro restaura total', async () => {
  await open();
  await measure();
  await tap(250, 140);
  expect(value('category-spending-name')).toBe('Moradia');
  await tap(250, 140);
  expect(value('category-spending-value')).toBe(formatCurrency(2410));
  await act(async () => legend('Transporte').props.onPress());
  expect(donut().props.selectedIndex).toBe(2);
  await tap(140, 140);
  expect(donut().props.selectedIndex).toBe(-1);
  expect(value('category-spending-share')).toBe('100%');
});
test('a legenda é alternativa acessível e permite alternar/desmarcar categorias', async () => {
  await open();
  await act(async () => legend('Moradia').props.onPress());
  await act(async () => legend('Transporte').props.onPress());
  expect(value('category-spending-value')).toBe(formatCurrency(340));
  expect(legend('Transporte').props.accessibilityState.selected).toBe(true);
  await act(async () => legend('Transporte').props.onPress());
  expect(value('category-spending-value')).toBe(formatCurrency(2410));
});
test('ocultar remove montantes e percentuais, esvazia renderer e não restaura seleção antiga', async () => {
  await open();
  await act(async () => legend('Moradia').props.onPress());
  await act(async () =>
    renderer.update(
      <CategoryExpensesChart
        categories={categories}
        periodLabel="Outubro de 2026"
        hidden
      />,
    ),
  );
  const text = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join(' ');
  expect(text).not.toContain('R$');
  expect(text).not.toContain('%');
  expect(value('category-spending-value')).toBe('••••••');
  expect(renderer.root.findByType(PieChart.Root.type).props.data).toEqual([]);
  expect(donut().props.selectedIndex).toBe(-1);
  expect(
    renderer.root.findAll(node => node.props.accessibilityRole === 'image')[0]
      .props.accessibilityLabel,
  ).toBe('Gastos do mês. Valores ocultos.');
  await act(async () =>
    renderer.update(
      <CategoryExpensesChart
        categories={categories}
        periodLabel="Outubro de 2026"
      />,
    ),
  );
  expect(donut().props.selectedIndex).toBe(-1);
});
test('trocar mês ou escopo limpa seleção mesmo que os IDs de categorias coincidam', async () => {
  const credit = [{ ...categories[0], total: 90 }];
  await open({ creditCategories: credit });
  await act(async () => legend('Moradia').props.onPress());
  await act(async () =>
    renderer.update(
      <CategoryExpensesChart
        categories={categories}
        creditCategories={credit}
        scope="credit"
        periodLabel="Outubro de 2026"
      />,
    ),
  );
  expect(donut().props.selectedIndex).toBe(-1);
  expect(value('category-spending-value')).toBe(formatCurrency(90));
  await act(async () => legend('Moradia').props.onPress());
  await act(async () =>
    renderer.update(
      <CategoryExpensesChart
        categories={categories}
        creditCategories={credit}
        scope="credit"
        periodLabel="Novembro de 2026"
      />,
    ),
  );
  expect(donut().props.selectedIndex).toBe(-1);
  expect(value('category-spending-name')).toBe('Novembro de 2026');
});
test('selecionar fatia fora da primeira página revela sua legenda e remover categoria retorna ao total', async () => {
  const many = Array.from({ length: 6 }, (_, i) => ({
    customCategoryUuid: String(i),
    name: `Categoria ${i}`,
    total: 6 - i,
    color: 'blue',
  }));
  await open({ categories: many });
  await act(async () =>
    renderer.root
      .findAllByProps({ testID: 'category-legend' })[0]
      .props.onLayout({ nativeEvent: { layout: { width: 350 } } }),
  );
  const root = renderer.root.findByType(PieChart.Root.type),
    data = root.props.data;
  expect(data).toHaveLength(6);
  await act(async () => donut().props.onSelectionChange(5));
  expect(value('category-spending-name')).toBe('Categoria 5');
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Página 2 de 2 das categorias',
    })[0].props.accessibilityState.selected,
  ).toBe(true);
  expect(legend('Categoria 5').props.accessibilityState.selected).toBe(true);
  expect(legend('Categoria 5').props.disabled).toBe(false);
  expect(root.props.data).toBe(data);
  await act(async () =>
    renderer.update(
      <CategoryExpensesChart
        categories={many.slice(0, 5)}
        periodLabel="Outubro de 2026"
      />,
    ),
  );
  expect(donut().props.selectedIndex).toBe(-1);
});

test('detecção respeita o buraco, os espaços e a borda deslocada da fatia selecionada', () => {
  const geometry = plotGeometry(280, 280, 0.66, 10),
    slices = [
      { value: 1, fraction: 0.25 },
      { value: 3, fraction: 0.75 },
    ];
  const reach = geometry.radius + 9;
  const x = 140 + reach / Math.sqrt(2),
    y = 140 - reach / Math.sqrt(2);
  expect(hitSlice(slices, x, y, geometry, 0)).toBe(0);
  expect(hitSlice(slices, x, y, geometry, -1)).toBe(-1);
  expect(hitSlice(slices, 140, 140, geometry)).toBe(-1);
  expect(hitSlice(slices, 140, 30, geometry)).toBe(-1);
  expect(hitSlice([], NaN, 30, geometry)).toBe(-1);
});
test('fatia selecionada usa mola do Reacticx na UI e desativação não depende de Reduzir movimento', async () => {
  const spring = jest.spyOn(Motion, 'withSpring');
  await act(async () => {
    renderer = TestRenderer.create(
      <CategoryDonut
        slices={[
          { key: 'a', total: 25, color: '#FFCC00' },
          { key: 'b', total: 75, color: '#00CC88' },
        ]}
        selectedIndex={0}
      />,
    );
  });
  await measure();
  // Skia lê valores derivados no renderer; o mock os expõe para essa leitura.
  const path = renderer.root.findAll(
    node => typeof node.props.path?.get === 'function',
  )[0];
  expect(path.props.path.get()).not.toContain('NaN');
  const moving = renderer.root.findAll(
    node => typeof node.props.transform?.get === 'function',
  )[0];
  const transform = moving.props.transform.get();
  expect(
    Math.hypot(transform[0].translateX, transform[1].translateY),
  ).toBeCloseTo(10);

  expect(spring).toHaveBeenCalledWith(
    1,
    expect.objectContaining({
      damping: 20,
      stiffness: 260,
      mass: 1,
      reduceMotion: 'never',
    }),
  );
});

test('web converte coordenadas do MouseEvent sem depender de locationX/Y nativo', async () => {
  const change = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <PieChartWeb.Root
        data={[
          { label: 'a', value: 1 },
          { label: 'b', value: 1 },
        ]}
        onSelectionChange={change}
      >
        <PieChartWeb.Slices />
      </PieChartWeb.Root>,
    );
  });
  await measure();
  const touch = renderer.root.findAllByProps({ testID: 'pie-chart-touch' })[0];
  await act(async () =>
    touch.props.onPress({
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 55,
          top: 179,
          width: 280,
          height: 280,
        }),
      },
      nativeEvent: { clientX: 300, clientY: 320 },
    }),
  );
  expect(change).toHaveBeenCalledWith(0);
});
