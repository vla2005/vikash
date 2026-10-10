import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, StyleSheet, Text } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import CategoryExpensesChart from '../src/components/CategoryExpensesChart';
import BalanceEvolutionChart from '../src/components/BalanceEvolutionChart';
import DashboardInsights from '../src/components/DashboardInsights';
import HomeCreditCards from '../src/components/HomeCreditCards';
import AccountsScreen from '../src/screens/AccountsScreen';
import useReducedMotion from '../src/hooks/useReducedMotion';
import { fetchDashboard } from '../src/services/dashboard';
import { dashboard, credit } from '../testFixtures/dashboard';
import { toRecentPurchaseRows, previousPeriod, shiftPeriod, spendingPace } from '../src/utils/dashboard';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn(() => true) }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');
jest.mock('../src/components/InstitutionLogo', () => 'InstitutionLogo');
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = ReactModule.forwardRef((props, ref) => ReactModule.createElement(View, { ...props, ref }));
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape,
    Polyline: Shape, Defs: Shape, ClipPath: Shape, Mask: Shape, G: Shape, LinearGradient: Shape, Stop: Shape, Polygon: Shape, Text: Shape };
});

let renderer;
let request;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 10, 9));
  useReducedMotion.mockReturnValue(true);
  request = jest.spyOn(global, 'fetch').mockImplementation(async url => ({
    ok: true, status: 200, json: async () => url.includes('/dashboard/credit') ? credit
      : url.includes('month=9') ? { ...dashboard, expenses: 1500 } : dashboard,
  }));
});
afterEach(async () => {
  await act(async () => renderer?.unmount()); renderer = null;
  jest.restoreAllMocks(); jest.useRealTimers();
});
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const text = () => renderer.root.findAllByType(Text).map(node => node.props.children).flat().filter(value => typeof value === 'string').join(' ');
const home = async props => act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" {...props} />); });

test('loads month, credit and previous month with authentication and displays the dashboard summary', async () => {
  await home({ profile: { name: 'Viktor Lima' } });
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard?year=2026&month=10', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer access', access_token: 'access' }),
  }));
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard/credit?year=2026&month=10', expect.anything());
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard?year=2026&month=9', expect.anything());
  expect(text()).toContain('2.370,00');
  expect(text()).toContain('330,00 a mais');
  expect(text()).toContain('183,00');
  expect(text()).toContain('5.673,00');
  expect(text()).toContain('Fatura vence em breve');
  expect(text()).toContain('85% utilizado');
  expect(renderer.root.findByType(DashboardInsights).findAllByType(Text).some(node =>
    Array.isArray(node.props.children) && node.props.children[0] === 'Cartão final 0032'
      && node.props.children.includes('85% utilizado'))).toBe(true);
  for (const removed of ['Seu crédito', 'Últimas compras no crédito', 'Onde você comprou']) { expect(text()).not.toContain(removed); }
  expect(text()).toContain('Resumo do mês');
  expect(text()).toContain('Este período vale para entradas, saídas e o gráfico de gastos abaixo.');
  const headings = renderer.root.findAll(node => node.type === Text && node.props.accessibilityRole === 'header')
    .map(node => node.props.children);
  expect(headings.slice(0, 4)).toEqual(['Resumo do mês', 'Gastos do mês', 'Evolução do saldo', 'De olho no mês']);
  expect(renderer.root.findByType(BalanceEvolutionChart).props.points).toEqual(dashboard.balanceEvolution);
  expect(renderer.root.findAllByType(HomeCreditCards)).toHaveLength(1);
});

test('eye masks every monetary value and percentages, including accessible chart data, and restores without GET', async () => {
  await home();
  const calls = request.mock.calls.length;
  await act(async () => button('Ocultar valores').props.onPress());
  expect(text()).not.toContain('R$');
  expect(text()).not.toContain('85%');
  expect(text()).not.toContain('32%');
  expect(text()).toContain('••••••');
  const chart = renderer.root.findAll(node => node.props.accessibilityRole === 'image')[0];
  expect(chart.props.accessibilityLabel).toBe('Gastos do mês. Valores ocultos.');
  expect(renderer.root.findByType(BalanceEvolutionChart).props.hidden).toBe(true);
  expect(text()).toContain('Mostre os valores para ver o gráfico.');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('14.850');
  await act(async () => button('Mostrar valores').props.onPress());
  expect(text()).toContain('14.850,00');
  expect(request).toHaveBeenCalledTimes(calls);
});

test('month arrows cross years and picker applies selected month and year to both requests', async () => {
  await home();
  await act(async () => button('Selecionar mês e ano').props.onPress());
  await act(async () => button('Ano anterior').props.onPress());
  await act(async () => button('Dezembro de 2025').props.onPress());
  await act(async () => button('Próximo mês').props.onPress());
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard?year=2026&month=1', expect.anything());
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard/credit?year=2026&month=1', expect.anything());
  await act(async () => button('Mês anterior').props.onPress());
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard?year=2025&month=12', expect.anything());
  expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  expect(previousPeriod({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
});

test('single category chart switches datasets without refetch and preserves full purchase amount', async () => {
  await home();
  expect(text()).toContain('3.940,00');
  const calls = request.mock.calls.length;
  await act(async () => button('Mostrar gastos no crédito').props.onPress());
  expect(text()).toContain('100%');
  expect(text()).not.toContain('3.940,00');
  expect(text()).toContain('Valor integral das compras no crédito');
  expect(request).toHaveBeenCalledTimes(calls);
  await act(async () => button('Mostrar gastos das contas').props.onPress());
  expect(text()).toContain('3.940,00');
});

test('recent tabs keep accounts and credit separate and open purchases, transactions, invoices and accounts', async () => {
  const onOpenTransaction = jest.fn(); const onOpenCard = jest.fn(); const onOpenAccount = jest.fn(); const onViewStatement = jest.fn();
  await home({ onOpenTransaction, onOpenCard, onOpenAccount, onViewStatement });
  expect(text().indexOf('Farmácia')).toBeLessThan(text().indexOf('Freelance'));
  expect(text()).not.toContain('Televisão');
  const calls = request.mock.calls.length;
  await act(async () => button('Mostrar compras recentes no crédito').props.onPress());
  expect(text()).not.toContain('Farmácia');
  expect(text()).not.toContain('Freelance');
  expect(text()).toContain('Televisão');
  await act(async () => button('Abrir lançamento Televisão').props.onPress());
  expect(onOpenTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'purchase', purchaseUuid: 'purchase' }));
  await act(async () => button('Mostrar transações recentes das contas').props.onPress());
  await act(async () => button('Abrir lançamento Farmácia').props.onPress());
  expect(onOpenTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'expense', purchaseUuid: null }));
  await act(async () => button('Abrir fatura de Cartão final 0032, vencimento 2026-10-12').props.onPress());
  expect(onOpenCard).toHaveBeenCalledWith('card', 'invoice');
  await act(async () => button('Abrir conta Conta principal').props.onPress());
  expect(onOpenAccount).toHaveBeenCalledWith('account');
  await act(async () => button('Ver extrato').props.onPress());
  expect(onViewStatement).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(calls);
});

test('spending pace covers leap year, completed months and future months without invented projections', () => {
  const today = new Date(2026, 9, 10);
  expect(spendingPace(310, { year: 2026, month: 10 }, today)).toEqual({ daily: 31, projection: 961 });
  expect(spendingPace(290, { year: 2024, month: 2 }, today)).toEqual({ daily: 10, projection: null });
  expect(spendingPace(50, { year: 2026, month: 11 }, today)).toBeNull();
  expect(spendingPace(0, { year: 2026, month: 10 }, today)).toEqual({ daily: 0, projection: 0 });
});

test('recent credit rows preserve purchase identity and integral amount for opening details', () => {
  const rows = toRecentPurchaseRows(credit.recentPurchases);
  expect(rows).toEqual([expect.objectContaining({ id: 'purchase', purchaseUuid: 'purchase', type: 'CREDIT_PURCHASE',
    amount: 1200, installmentCount: 5, payment: 'Crédito', account: 'Cartão final 0032' })]);
  expect(toRecentPurchaseRows()).toEqual([]);
});

test('API failure offers retry without replacing missing balance by zero', async () => {
  request.mockRejectedValueOnce(new TypeError('Network request failed'));
  await home();
  expect(text()).toContain('Não foi possível conectar à API');
  expect(text()).not.toContain('R$');
  await act(async () => button('Tentar carregar resumo novamente').props.onPress());
  expect(text()).toContain('14.850,00');
});

test('credit error keeps account summary and real categories, exposes retry, and never invents credit zeros', async () => {
  const normal = request.getMockImplementation();
  request.mockImplementation((url, ...args) => url.includes('/dashboard/credit') ? Promise.reject(new TypeError('offline')) : normal(url, ...args));
  await home();
  expect(text()).toContain('14.850,00');
  await act(async () => button('Mostrar gastos no crédito').props.onPress());
  expect(text()).toContain('Não foi possível conectar à API');
  expect(text()).not.toContain('100%');
  request.mockImplementation(normal);
  await act(async () => button('Tentar carregar gastos no crédito').props.onPress());
  expect(text()).toContain('100%');
});

test('late response from an old month cannot overwrite the chosen month and revision reloads it', async () => {
  let finish;
  request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await home({ revision: 0 });
  const oldSignal = request.mock.calls[0][1].signal;
  await act(async () => button('Mês anterior').props.onPress());
  expect(oldSignal.aborted).toBe(true);
  await act(async () => finish({ ok: true, json: async () => ({ ...dashboard, totalBalance: 9999 }) }));
  expect(text()).toContain('14.850,00');
  expect(text()).not.toContain('9.999,00');
  const calls = request.mock.calls.length;
  await act(async () => renderer.update(<HomeScreen accessToken="access" revision={1} />));
  expect(request.mock.calls.length).toBeGreaterThan(calls);
  expect(request).toHaveBeenCalledWith('http://api.test/api/dashboard?year=2026&month=9', expect.anything());
});

test('greeting follows system time without repeating API requests', async () => {
  jest.setSystemTime(new Date(2026, 9, 10, 5, 59));
  await home();
  expect(text()).toContain('Boa madrugada');
  const calls = request.mock.calls.length;
  await act(async () => jest.advanceTimersByTime(60000));
  expect(text()).toContain('Bom dia');
  jest.setSystemTime(new Date(2026, 9, 10, 12));
  await act(async () => jest.advanceTimersByTime(60000));
  expect(text()).toContain('Boa tarde');
  jest.setSystemTime(new Date(2026, 9, 10, 18));
  await act(async () => jest.advanceTimersByTime(60000));
  expect(text()).toContain('Boa noite');
  expect(request).toHaveBeenCalledTimes(calls);
});

test('donut groups additional categories without dropping totals and expands all category identities', async () => {
  const categories = Array.from({ length: 6 }, (_, index) => ({ customCategoryUuid: String(index), name: 'Categoria ' + index, color: 'sage', total: (6 - index) * 100 }));
  await act(async () => { renderer = TestRenderer.create(<CategoryExpensesChart categories={categories} />); });
  expect(text()).toContain('2.100,00');
  expect(text()).not.toContain('Categoria 5');
  await act(async () => button('Ver todas as categorias').props.onPress());
  expect(text()).toContain('Categoria 5');
  expect(text()).toContain('4,8%');
});

test('reduced motion skips donut and balance drawing; normal motion cleans up and never adds frame state listeners', async () => {
  const start = jest.fn(); const stop = jest.fn();
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start, stop });
  const listener = jest.spyOn(Animated.Value.prototype, 'addListener');
  await act(async () => { renderer = TestRenderer.create(<CategoryExpensesChart categories={dashboard.expensesPerCategory} />); });
  expect(timing).not.toHaveBeenCalled();
  useReducedMotion.mockReturnValue(false);
  await act(async () => renderer.update(<CategoryExpensesChart categories={dashboard.expensesPerCategory} periodLabel="Novembro" />));
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 900 }));
  expect(listener).not.toHaveBeenCalled();
  await act(async () => renderer.update(<CategoryExpensesChart categories={dashboard.expensesPerCategory} hidden />));
  expect(stop).toHaveBeenCalled();
  timing.mockClear();
  useReducedMotion.mockReturnValue(true);
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: 1000 + index }));
  await act(async () => renderer.update(<BalanceEvolutionChart points={points} />));
  expect(timing).not.toHaveBeenCalled();
  useReducedMotion.mockReturnValue(false);
  await act(async () => renderer.update(<BalanceEvolutionChart points={points} />));
  expect(timing).toHaveBeenCalledTimes(1);
  expect(listener).not.toHaveBeenCalled();
});

test('Accounts tab also displays the card stack and reduced motion selects the new card immediately', async () => {
  const cards = [...dashboard.creditCards, { ...dashboard.creditCards[0], uuid: 'second', lastFourDigits: 7070 }];
  await act(async () => { renderer = TestRenderer.create(<AccountsScreen accounts={[]} cards={cards} onOpenCard={jest.fn()} />); });
  expect(renderer.root.findAllByType(HomeCreditCards)).toHaveLength(0);
  await act(async () => button('Mostrar cartões').props.onPress());
  expect(renderer.root.findAllByType(HomeCreditCards)).toHaveLength(1);
  const timing = jest.spyOn(Animated, 'timing');
  await act(async () => button('Selecionar cartão Cartão final 7070').props.onPress());
  expect(button('Selecionar cartão Cartão final 7070').props.accessibilityState.selected).toBe(true);
  expect(timing).not.toHaveBeenCalled();
});

test('animated card selection prevents overlapping switches and opens the new invoice after movement finishes', async () => {
  useReducedMotion.mockReturnValue(false);
  let finish;
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: callback => { finish = callback; }, stop: jest.fn() });
  const cards = [...dashboard.creditCards, { ...dashboard.creditCards[0], uuid: 'second', lastFourDigits: 7070,
    currentInvoice: { uuid: 'new-invoice', total: 900, dueDate: '2026-10-20', status: 'OPEN' } }];
  const onOpenCard = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<HomeCreditCards cards={cards} onOpenCard={onOpenCard} />); });
  await act(async () => button('Selecionar cartão Cartão final 7070').props.onPress());
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 1050, useNativeDriver: true }));
  expect(button('Selecionar cartão Cartão final 7070').props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect(button('Ver detalhes de Cartão final 0032').props.disabled).toBe(true);
  await act(async () => button('Selecionar cartão Cartão final 0032').props.onPress());
  expect(timing).toHaveBeenCalledTimes(1);
  await act(async () => finish({ finished: true }));
  expect(button('Selecionar cartão Cartão final 7070').props.accessibilityState).toEqual({ selected: true, disabled: false });
  await act(async () => button('Ver fatura de Cartão final 7070').props.onPress());
  expect(onOpenCard).toHaveBeenCalledWith('second', 'new-invoice');
});

test('switching to the farthest card puts the receding card behind the middle card before the animation ends', async () => {
  useReducedMotion.mockReturnValue(false);
  let finish; let progress;
  jest.spyOn(Animated, 'timing').mockImplementation(value => {
    progress = value;
    return { start: callback => { finish = callback; }, stop: jest.fn() };
  });
  const digits = { Vermelho: 1111, Laranja: 2222, Azul: 3333 };
  const select = color => button(`Selecionar cartão Cartão final ${digits[color]}`);
  const cards = Object.entries(digits).map(([uuid, lastFourDigits]) => ({ ...dashboard.creditCards[0], uuid, lastFourDigits }));
  await act(async () => { renderer = TestRenderer.create(<HomeCreditCards cards={cards} />); });
  await act(async () => select('Laranja').props.onPress());
  await act(async () => { progress.setValue(1); finish({ finished: true }); });
  const layerOf = color => {
    let node = select(color).parent;
    while (node && StyleSheet.flatten(node.props.style)?.zIndex == null) { node = node.parent; }
    const layer = StyleSheet.flatten(node.props.style).zIndex;
    return typeof layer === 'number' ? layer : layer.__getValue();
  };
  await act(async () => select('Azul').props.onPress());
  expect(layerOf('Laranja')).toBeGreaterThan(layerOf('Vermelho'));
  await act(async () => progress.setValue(0.75));
  expect(layerOf('Laranja')).toBeLessThan(layerOf('Vermelho'));
  expect(select('Azul').props.disabled).toBe(true);
  const rearLayers = [layerOf('Laranja'), layerOf('Vermelho')];
  await act(async () => { progress.setValue(1); finish({ finished: true }); });
  expect([layerOf('Laranja'), layerOf('Vermelho')]).toEqual(rearLayers);
  expect(select('Azul').props.accessibilityState.selected).toBe(true);
});

test('Home card selection updates details and keeps financial data hidden until the eye is enabled', async () => {
  const second = { ...dashboard.creditCards[0], uuid: 'second', lastFourDigits: 7070, availableLimit: 3100,
    currentInvoice: { uuid: 'second-invoice', total: 900, status: 'OPEN', referenceMonth: '2026-10', closingDate: '2026-10-13', dueDate: '2026-10-20' } };
  request.mockImplementation(async url => ({ ok: true, status: 200, json: async () => url.includes('/dashboard/credit')
    ? credit : { ...dashboard, creditCards: [...dashboard.creditCards, second] } }));
  const onOpenCard = jest.fn();
  await home({ profile: { name: 'Viktor Lima' }, onOpenCard });
  expect(text()).toContain('Viktor Lima');
  await act(async () => button('Ocultar valores').props.onPress());
  await act(async () => button('Selecionar cartão Cartão final 7070').props.onPress());
  expect(button('Selecionar cartão Cartão final 7070').props.accessibilityState.selected).toBe(true);
  expect(text()).not.toContain('R$');
  expect(text()).not.toContain('% utilizado');
  expect(renderer.root.findAll(node => node.props.accessibilityRole === 'progressbar')).toHaveLength(0);
  await act(async () => button('Ver fatura de Cartão final 7070').props.onPress());
  expect(onOpenCard).toHaveBeenCalledWith('second', 'second-invoice');
  await act(async () => button('Mostrar valores').props.onPress());
  expect(text()).toContain('3.100,00');
  expect(text()).toContain('900,00');
  expect(text()).toContain('38% utilizado');
});

test('service accepts decimal strings and rejects missing summary, categories, accounts and transactions', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: '0.00', incomes: '123.45', expenses: 0 }) });
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toMatchObject({ totalBalance: 0, incomes: 123.45, expenses: 0 });
  for (const value of [{ ...dashboard, incomes: null }, { ...dashboard, expensesPerCategory: [null] },
    { ...dashboard, accounts: {} }, { ...dashboard, recentTransactions: [null] }]) {
    request.mockResolvedValueOnce({ ok: true, json: async () => value });
    await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow();
  }
});

test('dashboard normalizes nested cards, accounts and decimal category totals while rejecting malformed balance dates', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ ...dashboard,
    accounts: { accounts: dashboard.accounts }, creditCards: { creditCards: dashboard.creditCards },
    expensesPerCategory: [{ defaultCategoryId: 1, name: 'Mercado', total: '10.50' }],
  }) });
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toMatchObject({ accounts: [{ balance: 2400 }], creditCards: [{ availableLimit: 750 }], expensesPerCategory: [{ total: 10.5 }] });
  const points = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, balance: '100' }));
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ ...dashboard, balanceEvolution: points }) });
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toHaveProperty('balanceEvolution', points.map(point => ({ ...point, balance: 100 })));
  points[1].date = points[0].date;
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ ...dashboard, balanceEvolution: points }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('evolução do saldo');
});
