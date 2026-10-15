// Cobre também a paleta clara preservada, apesar de desabilitada no app.
jest.mock('../src/config/appearance', () => ({ lightThemeEnabled: true }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import CategoryExpensesChart from '../src/components/CategoryExpensesChart';
import CategoryDonut from '../src/components/CategoryDonut';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { readAppearance } from '../src/services/appearanceStorage';

jest.mock('../src/services/appearanceStorage', () => ({
  readAppearance: jest.fn(),
  writeAppearance: jest.fn(),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({
    width: 390,
    height: 844,
    scale: 3,
    fontScale: mockFontScale,
  }),
}));
let mockFontScale = 1;
const categories = Array.from({ length: 12 }, (_, i) => ({
  customCategoryUuid: String(i),
  name: `Categoria ${i}`,
  total: 120 - i * 10,
  color: 'blue',
}));
let renderer;
let props;
const byId = id => renderer.root.findAllByProps({ testID: id })[0];
const dot = (index, count = 3) =>
  renderer.root.findAllByProps({
    accessibilityLabel: `Página ${index + 1} de ${count} das categorias`,
  })[0];
const row = index =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel?.startsWith(`Categoria ${index}:`),
  )[0];
const donut = () => renderer.root.findByType(CategoryDonut.type);
const measure = width =>
  act(async () =>
    byId('category-legend').props.onLayout({
      nativeEvent: { layout: { width } },
    }),
  );
const swipeTo = (index, width = 350) =>
  act(async () =>
    byId('category-legend-pager').props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: width * index } },
    }),
  );
const render = () => (
  <ThemeProvider>
    <CategoryExpensesChart {...props} />
  </ThemeProvider>
);
async function mount(overrides = {}, theme = 'dark') {
  readAppearance.mockResolvedValue(theme);
  props = { categories, periodLabel: 'Outubro de 2026', ...overrides };
  await act(async () => {
    renderer = TestRenderer.create(render());
  });
}
async function update(next) {
  props = { ...props, ...next };
  await act(async () => renderer.update(render()));
}
beforeEach(() => {
  mockFontScale = 1;
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
});

test('arrastar pagina somente a legenda: cinco linhas por página, última parcial com altura estável e rosca completa', async () => {
  await mount();
  await measure(350);
  const slices = donut().props.slices;
  const first = byId('category-legend-page-0');
  const last = byId('category-legend-page-2');
  expect(slices).toHaveLength(12);
  expect(
    new Set(
      first
        .findAll(node => node.props.accessibilityRole === 'button')
        .map(node => node.props.accessibilityLabel),
    ).size,
  ).toBe(5);
  expect(StyleSheet.flatten(first.props.style).minHeight).toBe(
    StyleSheet.flatten(last.props.style).minHeight,
  );
  expect(dot(0).props.accessibilityState.selected).toBe(true);
  const header = byId('category-spending-value').props.children;
  await swipeTo(2);
  expect(dot(2).props.accessibilityState.selected).toBe(true);
  expect(row(10).props.disabled).toBe(false);
  expect(row(0).props.disabled).toBe(true);
  expect(row(0).props.tabIndex).toBe(-1);
  expect(byId('category-legend-page-0').props.accessibilityElementsHidden).toBe(
    true,
  );
  expect(byId('category-spending-value').props.children).toBe(header);
  expect(donut().props.slices).toBe(slices);
  expect(donut().props.selectedIndex).toBe(-1);
  await act(async () => row(11).props.onPress());
  expect(byId('category-spending-name').props.children).toBe('Categoria 11');
  await swipeTo(0);
  expect(donut().props.selectedIndex).toBe(11);
  expect(byId('category-spending-name').props.children).toBe('Categoria 11');
});

test('pontos oferecem navegação acessível e rotação preserva a página escolhida manualmente mesmo com seleção em outra página', async () => {
  await mount();
  await measure(350);
  await act(async () => row(0).props.onPress());
  await act(async () => dot(2).props.onPress());
  expect(dot(2).props.accessibilityState.selected).toBe(true);
  await measure(600);
  expect(dot(2).props.accessibilityState.selected).toBe(true);
  expect(
    StyleSheet.flatten(byId('category-legend-page-2').props.style).width,
  ).toBe(600);
  expect(donut().props.selectedIndex).toBe(0);
  await swipeTo(1, 600);
  expect(dot(1).props.accessibilityState.selected).toBe(true);
});

test('reduzir dados limita a página à última válida; ocultar, mês e escopo reiniciam na primeira', async () => {
  await mount({ creditCategories: categories });
  await measure(350);
  await swipeTo(2);
  await update({ categories: categories.slice(0, 6) });
  expect(dot(1, 2).props.accessibilityState.selected).toBe(true);
  await update({ hidden: true });
  expect(dot(0, 2).props.accessibilityState.selected).toBe(true);
  await measure(350);
  const text = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join(' ');
  expect(text).not.toContain('R$');
  expect(text).not.toContain('%');
  expect(
    renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityLabel?.includes('Valores ocultos.'),
      )
      .every(node => node.props.accessibilityState?.disabled),
  ).toBe(true);
  await act(async () => dot(1, 2).props.onPress());
  await update({ hidden: false });
  expect(dot(0, 2).props.accessibilityState.selected).toBe(true);
  await measure(350);
  await act(async () => dot(1, 2).props.onPress());
  await update({ periodLabel: 'Novembro de 2026' });
  expect(dot(0, 2).props.accessibilityState.selected).toBe(true);
  await measure(350);
  await act(async () => dot(1, 2).props.onPress());
  await update({ scope: 'credit' });
  expect(dot(0).props.accessibilityState.selected).toBe(true);
});

test.each(['dark', 'light'])(
  'indicador ativo é branco/preto no tema %s, com troca ao arrastar',
  async theme => {
    await mount({}, theme);
    await measure(350);
    const color = theme === 'dark' ? '#FFFFFF' : '#000000';
    expect(
      StyleSheet.flatten(byId('category-legend-dot-0').props.style)
        .backgroundColor,
    ).toBe(color);
    expect(
      StyleSheet.flatten(byId('category-legend-dot-1').props.style)
        .backgroundColor,
    ).not.toBe(color);
    await swipeTo(1);
    expect(
      StyleSheet.flatten(byId('category-legend-dot-1').props.style)
        .backgroundColor,
    ).toBe(color);
  },
);

test('até cinco categorias dispensam paginação e fonte ampliada preserva duas linhas nas páginas', async () => {
  await mount({ categories: categories.slice(0, 5) });
  await measure(280);
  expect(
    renderer.root.findAllByProps({ testID: 'category-legend-pager' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ testID: 'category-legend-dot-0' }),
  ).toHaveLength(0);
  mockFontScale = 2;
  await update({ categories });
  const height = StyleSheet.flatten(
    byId('category-legend-page-0').props.style,
  ).minHeight;
  expect(height).toBeGreaterThanOrEqual(5 * (40 * 2 + 24));
  expect(height).toBe(
    StyleSheet.flatten(byId('category-legend-page-2').props.style).minHeight,
  );
});
