import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import BalanceEvolutionChart from '../src/components/BalanceEvolutionChart';
import useReducedMotion from '../src/hooks/useReducedMotion';
jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn(() => false) }));
import { fetchDashboard } from '../src/services/dashboard';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape,
    Defs: Shape, ClipPath: Shape, G: Shape, LinearGradient: Shape, Stop: Shape, Polygon: Shape, Text: Shape };
});

let renderer;
let request;
beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200,
    json: async () => ({ totalBalance: 14850, incomes: 4200, expenses: 1830 }) });
});
afterEach(async () => {
  if (renderer) { await act(async () => renderer.unmount()); renderer = null; }
  request.mockRestore();
});
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function text() { return renderer.root.findAllByType(Text).map(node => node.props.children).flat().filter(value => typeof value === 'string').join(' '); }

test('loads current month with token, renders incomes, and changes both year and month', async () => {
  const today = new Date();
  await act(async () => { renderer = TestRenderer.create(<HomeScreen profile={{ name: 'Viktor Lima' }} accessToken="access" />); });
  expect(request).toHaveBeenLastCalledWith(`http://api.test/api/dashboard?year=${today.getFullYear()}&month=${today.getMonth() + 1}`,
    expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ access_token: 'access', Authorization: 'Bearer access' }) }));
  expect(text()).toContain('14.850,00');
  expect(text()).toContain('4.200,00');
  await act(async () => button('Selecionar mês e ano').props.onPress());
  await act(async () => button('Ano anterior').props.onPress());
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => button(`Janeiro de ${today.getFullYear() - 1}`).props.onPress());
  expect(request).toHaveBeenLastCalledWith(`http://api.test/api/dashboard?year=${today.getFullYear() - 1}&month=1`, expect.anything());
  await act(async () => button('Ocultar saldo total').props.onPress());
  expect(text()).not.toContain('14.850,00');
  expect(text()).toContain('4.200,00');
  expect(text()).toContain('••••••');
  expect(request).toHaveBeenCalledTimes(2);
});

test('older period response cannot replace the selected period, revision refreshes totals', async () => {
  let resolveOld;
  request.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" revision={0} />); });
  await act(async () => button('Selecionar mês e ano').props.onPress());
  await act(async () => button('Ano anterior').props.onPress());
  await act(async () => button(`Janeiro de ${new Date().getFullYear() - 1}`).props.onPress());
  await act(async () => resolveOld({ ok: true, status: 200, json: async () => ({ totalBalance: 999, incomes: 999, expenses: 999 }) }));
  expect(text()).toContain('14.850,00');
  expect(text()).not.toContain('999,00');
  await act(async () => renderer.update(<HomeScreen accessToken="access" revision={1} />));
  expect(request).toHaveBeenCalledTimes(3);
});

test('failure displays retry without inventing zero balances', async () => {
  request.mockRejectedValueOnce(new TypeError('Network request failed'));
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" />); });
  expect(text()).toContain('Não foi possível conectar à API');
  expect(text()).not.toContain('R$');
  await act(async () => button('Tentar carregar resumo novamente').props.onPress());
  expect(text()).toContain('14.850,00');
});

test('service accepts decimal strings and rejects missing fields', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: '0.00', incomes: '123.45', expenses: 0 }) });
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toEqual({ totalBalance: 0, incomes: 123.45, expenses: 0, incomesPercentageChange: null, expensesPercentageChange: null, balanceEvolution: [] });
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, income: 100, expenses: 0 }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('formato inesperado');
});

test('renders API daily balances and keeps the chart visible when hiding total balance', async () => {
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: String(1000 + index * 100) }));
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 1600, incomes: 0, expenses: 0, balanceEvolution: points }) });
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" />); });
  expect(text()).toContain('Evolução do saldo');
  const chart = renderer.root.findAll(node => node.props.accessibilityRole === 'image' && node.props.accessibilityLabel?.startsWith('Evolução do saldo'))[0];
  expect(chart.props.accessibilityLabel).toContain('1 out: R$');
  expect(chart.props.accessibilityLabel).toContain('Hoje: R$');
  expect(chart.props.accessibilityLabel).toContain('1.600,00');
  const paths = renderer.root.findAll(node => typeof node.props.d === 'string');
  expect(paths.some(node => node.props.d.includes('NaN') || node.props.d.includes('Infinity'))).toBe(false);
  await act(async () => button('Ocultar saldo total').props.onPress());
  expect(renderer.root.findAll(node => node.props.accessibilityRole === 'image' && node.props.accessibilityLabel?.startsWith('Evolução do saldo')).length).toBeGreaterThan(0);
  expect(text()).not.toContain('Mostre os valores para ver o gráfico.');
});

test('rejects malformed chart dates and non consecutive daily points', async () => {
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: 100 }));
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 100, incomes: 0, expenses: 0, balanceEvolution: points }) });
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toHaveProperty('balanceEvolution', points);
  points[1].date = points[0].date;
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 100, incomes: 0, expenses: 0, balanceEvolution: points }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('evolução do saldo');
});

test('comparisons display increase and decrease, remain visible, and handle zero or no baseline', async () => {
  request.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ totalBalance: 2000, incomes: 1200, expenses: 2200,
    incomesPercentageChange: '20.5', expensesPercentageChange: -12 }) });
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" revision={0} />); });
  expect(text()).toContain('20,5% mais entradas');
  expect(text()).toContain('12% menos saídas');
  expect(text()).toContain(`Comparando até o dia ${new Date().getDate()}`);
  await act(async () => button('Ocultar saldo total').props.onPress());
  expect(text()).toContain('20,5%');
  expect(text()).toContain('12%');
  await act(async () => button('Mostrar saldo total').props.onPress());
  request.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ totalBalance: 2000, incomes: 0, expenses: 0,
    incomesPercentageChange: null, expensesPercentageChange: 0 }) });
  await act(async () => renderer.update(<HomeScreen accessToken="access" revision={1} />));
  expect(text()).not.toContain('Sem base de comparação');
  expect(text()).toContain('Saídas sem variação');
  expect(text()).not.toContain('12%');
  request.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ totalBalance: 2000, incomes: 0, expenses: 0,
    incomesPercentageChange: null, expensesPercentageChange: null }) });
  await act(async () => renderer.update(<HomeScreen accessToken="access" revision={2} />));
  expect(text()).not.toContain('sem variação');
  expect(text()).not.toContain('Comparando até o dia');
});

test('chart draws progressively and shows the final value after completing the animation', async () => {
  jest.useFakeTimers();
  try {
    const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: 1000 + index * 100 }));
    await act(async () => { renderer = TestRenderer.create(<BalanceEvolutionChart points={points} />); });
    const revealWidth = () => renderer.root.findAll(node => node.props.x === 31 && node.props.height === 158)[0].props.width;
    expect(revealWidth()).toBe(0);
    await act(async () => jest.advanceTimersByTime(550));
    expect(revealWidth()).toBeGreaterThan(0);
    expect(revealWidth()).toBeLessThan(320);
    await act(async () => jest.advanceTimersByTime(1600));
    expect(revealWidth()).toBe(320);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(revealWidth()).toBe(320);
    expect(renderer.root.findAll(node => node.props.r === 3.5 && node.props.strokeWidth === 2)).toHaveLength(0);
    await act(async () => renderer.unmount());
    renderer = null;
  } finally { jest.useRealTimers(); }
});

test('reduced motion still draws the chart once with a slower reveal', async () => {
  jest.useFakeTimers();
  try {
  useReducedMotion.mockReturnValue(true);
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: 100 }));
  await act(async () => { renderer = TestRenderer.create(<BalanceEvolutionChart points={points} />); });
  const revealWidth = () => renderer.root.findAll(node => node.props.x === 31 && node.props.height === 158)[0].props.width;
  expect(revealWidth()).toBe(0);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(revealWidth()).toBeGreaterThan(0);
  expect(revealWidth()).toBeLessThan(320);
  await act(async () => jest.advanceTimersByTime(1700));
  expect(revealWidth()).toBe(320);
  await act(async () => renderer.unmount()); renderer = null;
  } finally { jest.useRealTimers(); }
});

test('greeting follows local system time and updates without reloading the dashboard', async () => {
  jest.useFakeTimers();
  try {
    jest.setSystemTime(new Date(2026, 9, 6, 5, 59));
    await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" />); });
    expect(text()).toContain('Boa madrugada');
    await act(async () => jest.advanceTimersByTime(60000));
    expect(text()).toContain('Bom dia');
    jest.setSystemTime(new Date(2026, 9, 6, 11, 59));
    await act(async () => jest.advanceTimersByTime(60000));
    expect(text()).toContain('Boa tarde');
    jest.setSystemTime(new Date(2026, 9, 6, 17, 59));
    await act(async () => jest.advanceTimersByTime(60000));
    expect(text()).toContain('Boa noite');
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    renderer = null;
  } finally { jest.useRealTimers(); }
});
