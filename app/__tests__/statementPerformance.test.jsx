import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FlatList, TextInput } from 'react-native';
import StatementScreen from '../src/screens/StatementScreen';
import StatementDay from '../src/components/statement/StatementDay';
import StatementList from '../src/components/statement/StatementList';
import WebStatementList from '../src/components/statement/StatementList.web';
import { DockContext } from '../src/contexts/DockContext';
import SwipeableRow from '../src/components/SwipeableRow';
import useTransactions from '../src/hooks/useTransactions';
import * as calculations from '../src/utils/statement';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import * as transactions from '../src/services/transactions';
import { emptyFilters } from '../src/components/StatementFilters';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/hooks/useTransactions', () => jest.fn());
jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');
jest.mock('../src/components/SwipeableRow', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(props => ReactModule.createElement(View, props)),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
let renderer;
const loadMore = jest.fn();
const retry = jest.fn();
const reload = jest.fn();
const row = (id, date, extra = {}) => ({
  id,
  date,
  description: `Lançamento ${id}`,
  amount: 10,
  type: 'EXPENSE',
  account: 'Inter',
  category: 'Mercado',
  payment: 'Pix',
  ...extra,
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 14, 12));
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
function data(rows) {
  useTransactions.mockReturnValue({
    rows,
    loading: false,
    error: '',
    hasNext: false,
    loadMore,
    retry,
    reload,
  });
}
const list = () => renderer.root.findByType(FlatList);

test('histórico de 150 lançamentos virtualiza dias mantendo o material e os objetos originais', async () => {
  const rows = Array.from({ length: 30 }, (_, day) =>
    Array.from({ length: 5 }, (_item, index) =>
      row(`${day}-${index}`, `2026-10-${String(day + 1).padStart(2, '0')}`),
    ),
  ).flat();
  data(rows);
  await act(async () => {
    renderer = TestRenderer.create(<StatementScreen accessToken="token" />);
  });
  expect(list().props.data).toHaveLength(30);
  expect(list().props.data[0].date).toBe('2026-10-30');
  expect(list().props.data[0].rows[0]).toBe(rows[145]);
  const mounted = renderer.root.findAllByType(StatementDay.type);
  expect(mounted.length).toBeGreaterThan(0);
  expect(mounted.length).toBeLessThan(30);
  expect(renderer.root.findAllByType(SwipeableRow).length).toBeLessThan(
    rows.length,
  );
  expect(list().props.removeClippedSubviews).toBe(false);
});

test('swipe e filtros não recalculam dados; só as duas linhas com estado alterado renderizam', async () => {
  data([
    row('one', '2026-10-14'),
    row('two', '2026-10-14'),
    row('three', '2026-10-13'),
  ]);
  const index = jest.spyOn(calculations, 'indexStatementRows');
  const filter = jest.spyOn(calculations, 'filterStatementRows');
  const summarize = jest.spyOn(calculations, 'summarizeStatementRows');
  await act(async () => {
    renderer = TestRenderer.create(<StatementScreen accessToken="token" />);
  });
  const groups = list().props.data;
  const header = list().props.ListHeaderComponent;
  const one = renderer.root
    .findAllByType(SwipeableRow)
    .find(node => node.props.label.endsWith('one'));
  const two = renderer.root
    .findAllByType(SwipeableRow)
    .find(node => node.props.label.endsWith('two'));
  const stableCallback = one.props.onOpenChange;
  SwipeableRow.mockClear();
  await act(async () => one.props.onOpenChange(true));
  expect(SwipeableRow).toHaveBeenCalledTimes(1);
  expect(one.props.onOpenChange).toBe(stableCallback);
  expect(list().props.data).toBe(groups);
  expect(list().props.ListHeaderComponent === header).toBe(true);
  SwipeableRow.mockClear();
  await act(async () => two.props.onOpenChange(true));
  expect(SwipeableRow).toHaveBeenCalledTimes(2);
  expect(index).toHaveBeenCalledTimes(1);
  expect(filter).toHaveBeenCalledTimes(1);
  expect(summarize).toHaveBeenCalledTimes(1);
  await act(async () =>
    renderer.root
      .findAll(
        node =>
          node.props.accessibilityLabel === 'Abrir filtros do extrato' &&
          node.props.onPress,
      )[0]
      .props.onPress(),
  );
  expect(filter).toHaveBeenCalledTimes(1);
  await act(async () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Buscar lançamento')
      .props.onChangeText('one'),
  );
  expect(index).toHaveBeenCalledTimes(1);
  expect(filter).toHaveBeenCalledTimes(2);
  expect(list().props.data[0].rows.map(item => item.id)).toEqual(['one']);
});

test('busca normalizada, conta destino, limites decimais e totais preservam semântica financeira', () => {
  const rows = [
    row('salary', '2026-10-14', { type: 'INCOME', amount: 100 }),
    row('invoice', '2026-10-13', {
      type: 'INVOICE_PAYMENT',
      amount: 20.5,
      description: 'Farmácia',
    }),
    row('transfer', '2026-10-13', {
      type: 'TRANSFER',
      amount: 300,
      destinationAccount: 'Itaú',
    }),
    row('old', '2026-09-14', { amount: 999 }),
  ];
  const index = calculations.indexStatementRows(rows);
  const all = calculations.filterStatementRows(
    rows,
    index.searchText,
    '2026-10',
    '',
    'ALL',
    emptyFilters(),
  );
  const model = calculations.summarizeStatementRows(
    all,
    new Date(2026, 9, 14, 12),
  );
  expect(model.totals).toEqual({ INCOME: 100, EXPENSE: 20.5 });
  expect(model.groups.map(group => group.label)).toEqual([
    'Hoje, 14 de outubro',
    'Ontem, 13 de outubro',
  ]);
  expect(model.groups[1].rows.map(item => item.id)).toEqual([
    'invoice',
    'transfer',
  ]);
  const matching = calculations.filterStatementRows(
    rows,
    index.searchText,
    '2026-10',
    'farmacia',
    'EXPENSE',
    { ...emptyFilters(), min: '20,5', max: '20,5' },
  );
  expect(matching).toEqual([rows[1]]);
  expect(
    calculations.filterStatementRows(
      rows,
      index.searchText,
      '2026-10',
      '',
      'ALL',
      { ...emptyFilters(), accounts: ['Itaú'] },
    ),
  ).toEqual([rows[2]]);
  expect(
    calculations.filterStatementRows(
      rows,
      index.searchText,
      '2026-10',
      '',
      'ALL',
      { ...emptyFilters(), transfers: false },
    ),
  ).toEqual(rows.slice(0, 2));
});

test('paginação preserva linhas existentes e as ações continuam ligadas ao item correto', async () => {
  const first = row('one', '2026-10-14');
  const second = row('two', '2026-10-14', {
    purchaseUuid: 'purchase-two',
    installmentCount: 3,
    installmentNumber: 1,
  });
  const onOpen = jest.fn();
  const onDeleted = jest.fn();
  const remove = jest
    .spyOn(transactions, 'deleteCreditCardPurchase')
    .mockResolvedValue();
  data([first, second]);
  await act(async () => {
    renderer = TestRenderer.create(
      <StatementScreen
        accessToken="token"
        onOpenTransaction={onOpen}
        onDeleted={onDeleted}
      />,
    );
  });
  const existing = renderer.root
    .findAllByType(SwipeableRow)
    .find(node => node.props.label.endsWith('two'));
  const oldHandler = existing.props.onOpenChange;
  SwipeableRow.mockClear();
  data([first, second, row('three', '2026-10-14')]);
  await act(async () =>
    renderer.update(
      <StatementScreen
        revision={1}
        accessToken="token"
        onOpenTransaction={onOpen}
        onDeleted={onDeleted}
      />,
    ),
  );
  expect(SwipeableRow).toHaveBeenCalledTimes(1);
  expect(existing.props.onOpenChange).toBe(oldHandler);
  await act(async () => existing.props.onPress());
  expect(onOpen).toHaveBeenCalledWith(second);
  await act(async () => existing.props.onAction());
  const dialog = renderer.root.findByType(ConfirmationDialog);
  expect(dialog.props.visible).toBe(true);
  expect(dialog.props.message).toContain('compra inteira');
  expect(remove).not.toHaveBeenCalled();
  await act(async () => dialog.props.onConfirm());
  expect(remove).toHaveBeenCalledWith('purchase-two', 'token');
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

test.each([StatementList, WebStatementList])(
  'rolagem virtualizada mantém os limiares do dock e pagina só uma vez por extensão',
  async List => {
    let targetValue = 0;
    const more = jest.fn();
    const context = {
      target: {
        get: () => targetValue,
        set: value => {
          targetValue = value;
        },
      },
      collapsed: false,
      setCollapsed: value => {
        context.collapsed = value;
      },
    };
    await act(async () => {
      renderer = TestRenderer.create(
        <DockContext.Provider value={context}>
          <List data={[]} renderItem={() => null} onReachEnd={more} />
        </DockContext.Provider>,
      );
    });
    const event = (y, height = 1600) => ({
      nativeEvent: {
        contentOffset: { y },
        layoutMeasurement: { height: 600 },
        contentSize: { height },
      },
    });
    const scroll = e => renderer.root.findByType(FlatList).props.onScroll(e);
    await act(async () => scroll(event(120)));
    expect(List === StatementList ? targetValue : context.collapsed).toBe(
      List === StatementList ? 1 : true,
    );
    await act(async () => scroll(event(60)));
    expect(List === StatementList ? targetValue : context.collapsed).toBe(
      List === StatementList ? 0 : false,
    );
    await act(async () => {
      scroll(event(800));
      scroll(event(810));
    });
    expect(more).toHaveBeenCalledTimes(1);
    await act(async () => scroll(event(1000, 1800)));
    expect(more).toHaveBeenCalledTimes(2);
  },
);
