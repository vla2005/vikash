import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import BalanceEvolutionChart from '../src/components/BalanceEvolutionChart';
import HomeCreditCards from '../src/components/HomeCreditCards';
import CategoryExpensesChart from '../src/components/CategoryExpensesChart';
import useReducedMotion from '../src/hooks/useReducedMotion';
jest.mock('../src/hooks/useReducedMotion', () => ({ __esModule: true, default: jest.fn(() => false) }));
import { fetchDashboard } from '../src/services/dashboard';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape, Polyline: Shape,
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
  await expect(fetchDashboard(2026, 10, 'access')).resolves.toEqual({ totalBalance: 0, incomes: 123.45, expenses: 0, incomesPercentageChange: null, expensesPercentageChange: null, balanceEvolution: [], creditCards: [], accounts: [], expensesPerCategory: [], recentTransactions: [] });
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

const dashboardCards = [
  { uuid: 'bradesco', description: 'Cartão final 3732', creditLimit: '2500.00', availableLimit: '500.00', financialInstitution: { id: 4, name: 'Bradesco' }, currentInvoice: { uuid: 'invoice-bradesco', total: '1000.00', closingDate: '2026-11-04', dueDate: '2026-11-10', status: 'OPEN' } },
  { uuid: 'itau', description: 'Meu cartão Itaú', creditLimit: '5000.00', availableLimit: '1000.00', financialInstitution: { id: 1, name: 'Itaú' }, currentInvoice: { uuid: 'invoice-itau', total: '800.00', closingDate: '2026-11-03', dueDate: '2026-11-10', status: 'CLOSED' } },
];

test('uses dashboard cards without an extra GET and switches invoice details after the overlay animation', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 2000, incomes: 0, expenses: 0, creditCards: { creditCards: dashboardCards } }) });
  const openCard = jest.fn();
  let completeAnimation;
  const animate = jest.spyOn(Animated, 'timing').mockImplementation(() => ({ start: callback => { completeAnimation = callback; }, stop: jest.fn() }));
  try {
    await act(async () => { renderer = TestRenderer.create(<HomeScreen profile={{ name: 'Viktor Lima' }} accessToken="access" onOpenCard={openCard} />); });
    expect(text()).toContain('1.000,00');
    expect(text()).toContain('80% utilizado');
    await act(async () => button('Selecionar cartão Meu cartão Itaú').props.onPress());
    expect(animate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 680, useNativeDriver: true }));
    expect(button('Selecionar cartão Cartão final 3732').props.disabled).toBe(true);
    expect(text()).not.toContain('800,00');
    await act(async () => completeAnimation({ finished: true }));
    expect(text()).toContain('800,00');
    expect(text()).toContain('Fechada');
    expect(text()).not.toContain('500,00');
    expect(button('Selecionar cartão Meu cartão Itaú').props.accessibilityState.selected).toBe(true);
    await act(async () => button('Ver fatura de Meu cartão Itaú').props.onPress());
    expect(openCard).toHaveBeenCalledWith('itau', 'invoice-itau');
    expect(request).toHaveBeenCalledTimes(1);
  } finally { animate.mockRestore(); }
});

test('all cards remain selectable even beyond the three visible faces and removed selection resets safely', async () => {
  jest.useFakeTimers();
  try {
  useReducedMotion.mockReturnValue(true);
  const cards = Array.from({ length: 5 }, (_, index) => ({ uuid: `card-${index}`, description: `Cartão ${index}`, creditLimit: 1000, availableLimit: 1000, currentInvoice: null }));
  const openCard = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<HomeCreditCards cards={cards} onOpenCard={openCard} />); });
  expect(button('Mostrar cartão Cartão 4')).toBeDefined();
  await act(async () => button('Mostrar cartão Cartão 4').props.onPress());
  await act(async () => jest.advanceTimersByTime(220));
  expect(button('Selecionar cartão Cartão 4').props.accessibilityState.selected).toBe(true);
  expect(text()).toContain('Nenhuma fatura em aberto');
  expect(text()).toContain('0% utilizado');
  await act(async () => button('Ver detalhes de Cartão 4').props.onPress());
  expect(openCard).toHaveBeenCalledWith('card-4', undefined);
  await act(async () => renderer.update(<HomeCreditCards cards={cards.slice(0, 2)} onOpenCard={openCard} />));
  expect(button('Selecionar cartão Cartão 0').props.accessibilityState.selected).toBe(true);
  await act(async () => renderer.update(<HomeCreditCards cards={[]} onOpenCard={openCard} />));
  expect(text()).toContain('Adicione um cartão');
  expect(text()).not.toContain('Fatura atual');
  await act(async () => renderer.unmount()); renderer = null;
  } finally { jest.useRealTimers(); }
});

test('dashboard normalizes nested cards and rejects malformed card data', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, incomes: 0, expenses: 0, creditCards: { creditCards: dashboardCards } }) });
  const data = await fetchDashboard(2026, 10, 'access');
  expect(data.creditCards[0]).toMatchObject({ creditLimit: 2500, availableLimit: 500, currentInvoice: { total: 1000 } });
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, incomes: 0, expenses: 0, creditCards: { creditCards: [null] } }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('formato inesperado');
});

test('category percentages use category spending, preserve identical names, and change with the period', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 2000, incomes: 100, expenses: 900,
    incomesPercentageChange: 20, expensesPercentageChange: -12,
    expensesPerCategory: [
      { defaultCategoryId: 1, name: 'Mercado', color: 'ochre', total: '300.00' },
      { customCategoryUuid: 'custom-market', name: 'Mercado', color: 'blue', total: '100.00' },
    ] }) });
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" />); });
  expect(text()).toContain('75% dos gastos');
  expect(text()).toContain('25% dos gastos');
  expect(text()).toContain('400,00');
  expect(text().indexOf('Gastos por categoria')).toBeGreaterThan(text().indexOf('12% menos saídas'));
  expect(text().indexOf('Gastos por categoria')).toBeLessThan(text().indexOf('Minhas contas e cartões'));
  const chart = () => renderer.root.findAll(node => node.props.accessibilityRole === 'image' && node.props.accessibilityLabel?.startsWith('Gastos por categoria'))[0];
  expect(chart().props.accessibilityLabel).toContain('Mercado: 75%');
  expect(chart().props.accessibilityLabel).toContain('Mercado: 25%');
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 2000, incomes: 0, expenses: 50,
    expensesPerCategory: [{ defaultCategoryId: 2, name: 'Saúde', color: 'sage', total: 50 }] }) });
  await act(async () => button('Selecionar mês e ano').props.onPress());
  await act(async () => button(`Janeiro de ${new Date().getFullYear()}`).props.onPress());
  expect(text()).toContain('100% dos gastos');
  expect(text()).not.toContain('75% dos gastos');
  expect(text()).toContain(`Janeiro de ${new Date().getFullYear()}`);
  expect(text()).toContain('Contas e parcelas do crédito');
  expect(chart().props.accessibilityLabel).toContain('Saúde: 100%');
});

test('empty categories render a real empty state, while one category renders a full pie without invalid arcs', async () => {
  jest.useFakeTimers();
  try {
  await act(async () => { renderer = TestRenderer.create(<CategoryExpensesChart categories={[]} periodLabel="Outubro de 2026" />); });
  expect(text()).toContain('Nenhum gasto neste período');
  expect(text()).not.toContain('NaN');
  await act(async () => renderer.update(<CategoryExpensesChart categories={[{ defaultCategoryId: 1, name: 'Casa', color: 'terracotta', total: 100 }]} />));
  expect(text()).toContain('100% dos gastos');
  await act(async () => jest.advanceTimersByTime(2100));
  expect(renderer.root.findAll(node => node.props.r === 105 && node.props.fill === '#BD704E').length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => typeof node.props.d === 'string')).toHaveLength(0);
  await act(async () => renderer.unmount()); renderer = null;
  } finally { jest.useRealTimers(); }
});

test('pie draws clockwise once, reveals the following slices, and restarts for a new period', async () => {
  jest.useFakeTimers();
  try {
    const categories = [
      { defaultCategoryId: 1, name: 'Mercado', color: 'ochre', total: 50 },
      { defaultCategoryId: 2, name: 'Casa', color: 'terracotta', total: 50 },
    ];
    const paths = () => [...new Set(renderer.root.findAll(node => typeof node.props.d === 'string').map(node => node.props.d))];
    await act(async () => { renderer = TestRenderer.create(<CategoryExpensesChart categories={categories} periodLabel="Outubro de 2026" />); });
    expect(paths()).toHaveLength(0);
    await act(async () => jest.advanceTimersByTime(500));
    expect(paths()).toHaveLength(1);
    const partial = paths()[0];
    await act(async () => jest.advanceTimersByTime(1000));
    expect(paths()).toHaveLength(2);
    expect(paths()[0]).not.toBe(partial);
    expect(paths().join()).not.toMatch(/NaN|Infinity/);
    await act(async () => jest.advanceTimersByTime(600));
    const complete = paths();
    await act(async () => jest.advanceTimersByTime(5000));
    expect(paths()).toEqual(complete);
    await act(async () => renderer.update(<CategoryExpensesChart categories={categories} periodLabel="Novembro de 2026" />));
    expect(paths()).toHaveLength(0);
    await act(async () => renderer.unmount()); renderer = null;
  } finally { jest.useRealTimers(); }
});

test.each([[null], {}, [{ total: -10 }], [{ total: 'bad' }]])('rejects malformed category totals: %p', async categories => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, incomes: 0, expenses: 0, expensesPerCategory: categories }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('gastos por categoria');
});

test('dashboard displays its nested accounts before cards and opens the selected account without another list GET', async () => {
  const accounts = [
    { uuid: 'bank-account', description: 'Minha conta Itaú', type: 'CONTA_CORRENTE', balance: '2000.00', financialInstitution: { id: 1, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } },
    { uuid: 'wallet', description: 'Dinheiro', type: 'CARTEIRA', balance: -50, financialInstitution: null },
  ];
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 1950, incomes: 0, expenses: 0,
    accounts: { accounts }, creditCards: { creditCards: dashboardCards } }) });
  const openAccount = jest.fn();
  const viewAll = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" onOpenAccount={openAccount} onViewCards={viewAll} />); });
  expect(text()).toContain('Minhas contas e cartões');
  expect(text()).toContain('Conta corrente');
  expect(text()).toContain('Carteira');
  expect(text()).toContain('2.000,00');
  expect(text()).toMatch(/-R\$\s50,00/);
  expect(text().indexOf('Minha conta Itaú')).toBeLessThan(text().indexOf('Dinheiro'));
  expect(text().indexOf('Dinheiro')).toBeLessThan(text().indexOf('Cartões de crédito'));
  await act(async () => button('Abrir conta Dinheiro').props.onPress());
  expect(openAccount).toHaveBeenCalledWith('wallet');
  await act(async () => button('Ver todas as contas e cartões').props.onPress());
  expect(viewAll).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1);
});

test('dashboard validates accounts and retains the wallet without a financial institution', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 50, incomes: 0, expenses: 0,
    accounts: { accounts: [{ uuid: 'wallet', description: 'Dinheiro', type: 'CARTEIRA', balance: '50.00', financialInstitution: null }] } }) });
  const data = await fetchDashboard(2026, 10, 'access');
  expect(data.accounts[0]).toMatchObject({ uuid: 'wallet', balance: 50, financialInstitution: null });
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, incomes: 0, expenses: 0, accounts: {} }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('lista de contas');
});

test('recent movements come from dashboard, show signs and dates, and open details or the statement', async () => {
  const today = new Date();
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 100, incomes: 800, expenses: 50, recentTransactions: [
    { uuid: 'expense', description: 'Farmácia', amount: '50.00', type: 'EXPENSE', paymentMethod: 'PIX', occurredAt: `${localDate(today)}T12:00:00`, categoryColor: 'sage', categoryIcon: 'health', institutionName: 'Inter' },
    { uuid: 'income', description: 'Freelance', amount: 800, type: 'INCOME', paymentMethod: 'PIX', occurredAt: `${localDate(yesterday)}T19:00:00`, categoryColor: 'mint', categoryIcon: 'briefcase', institutionName: 'Inter' },
    { uuid: 'transfer', description: 'Entre minhas contas', amount: 20, type: 'TRANSFER', paymentMethod: 'BANK_TRANSFER', occurredAt: `${localDate(today)}T10:00:00`, institutionName: 'Carteira' },
  ] }) });
  const open = jest.fn();
  const viewStatement = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<HomeScreen accessToken="access" onOpenTransaction={open} onViewStatement={viewStatement} />); });
  expect(text()).toContain('Movimentações recentes');
  expect(text().indexOf('Movimentações recentes')).toBeGreaterThan(text().indexOf('Cartões de crédito'));
  expect(text()).toMatch(/− R\$\s50,00/);
  expect(text()).toMatch(/\+ R\$\s800,00/);
  expect(text()).toContain('Hoje · Pix · Inter');
  expect(text()).toContain('Ontem · Pix · Inter');
  await act(async () => button('Abrir lançamento Farmácia').props.onPress());
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'expense', amount: 50 }));
  await act(async () => button('Ver extrato').props.onPress());
  expect(viewStatement).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1);
});

test('malformed recent transactions are rejected instead of displayed as invented movements', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => ({ totalBalance: 0, incomes: 0, expenses: 0, recentTransactions: [null] }) });
  await expect(fetchDashboard(2026, 10, 'access')).rejects.toThrow('transação em formato inesperado');
});
