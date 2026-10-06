import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import AccountsScreen from '../src/screens/AccountsScreen';
import CategoriesScreen from '../src/screens/CategoriesScreen';
import StatementScreen from '../src/screens/StatementScreen';
import AccountDetailsScreen from '../src/screens/AccountDetailsScreen';
import CreditCardDetailsScreen from '../src/screens/CreditCardDetailsScreen';
import TransactionDetailsLayout from '../src/components/TransactionDetailsLayout';
import PagedTransactionList from '../src/components/PagedTransactionList';
import InvoicePaymentDrawer from '../src/components/InvoicePaymentDrawer';
import PrimaryButton from '../src/components/PrimaryButton';
import useTransactions from '../src/hooks/useTransactions';

jest.mock('../src/hooks/useDashboard', () => () => ({ data: null, loading: true, error: '' }));
jest.mock('../src/hooks/useAccounts', () => () => ({ accounts: [], loading: true, error: '' }));
jest.mock('../src/hooks/useCreditCardDetails', () => () => ({ card: null, loading: true, error: '' }));
jest.mock('../src/hooks/useAccountDetails', () => () => ({ account: null, loading: true, error: '' }));
jest.mock('../src/hooks/useTransactions', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../src/hooks/useToast', () => () => ({ showToast: jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/CategoryIcon', () => 'CategoryIcon');
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));

let renderer;
beforeEach(() => useTransactions.mockReturnValue({ rows: [], loading: true, error: '', hasNext: false }));
afterEach(async () => { await act(async () => renderer?.unmount()); });
const busyGroups = () => renderer.root.findAll(node => node.props.accessibilityState?.busy && node.props.accessibilityLabel);

test.each([
  ['Home', <HomeScreen />, 'Carregando resumo'],
  ['Contas', <AccountsScreen accounts={[]} loading cardsLoading />, 'Carregando contas'],
  ['Categorias', <CategoriesScreen loading />, 'Carregando categorias'],
  ['Extrato', <StatementScreen />, 'Carregando extrato'],
  ['Conta', <AccountDetailsScreen uuid="account" />, 'Carregando detalhes da conta'],
  ['Cartão', <CreditCardDetailsScreen uuid="card" />, 'Carregando detalhes do cartão'],
  ['Transação/compra', <TransactionDetailsLayout title="Detalhes" loading />, 'Carregando detalhes do lançamento'],
  ['Fatura', <PagedTransactionList />, 'Carregando lançamentos'],
  ['Pagamento', <InvoicePaymentDrawer invoice={{ total: 50 }} />, 'Carregando contas para pagamento'],
])('%s usa skeleton acessível sem spinner durante a consulta', async (_, screen, label) => {
  await act(async () => { renderer = TestRenderer.create(screen); });
  expect(busyGroups().some(node => node.props.accessibilityLabel === label)).toBe(true);
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});

test('contas substitui os skeletons pelos dados e mantém erro com opção de tentar novamente', async () => {
  await act(async () => { renderer = TestRenderer.create(<AccountsScreen accounts={[]} loading cardsLoading />); });
  expect(busyGroups().length).toBeGreaterThan(0);
  await act(async () => renderer.update(<AccountsScreen accounts={[{ uuid: 'cash', description: 'Dinheiro', type: 'CARTEIRA', balance: 50 }]} loading={false} cardsLoading={false} />));
  expect(busyGroups()).toHaveLength(0);
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === 'Dinheiro')).toBe(true);
  const retry = jest.fn();
  await act(async () => renderer.update(<AccountsScreen accounts={[]} loading={false} error="Sem conexão" onRetry={retry} />));
  const button = renderer.root.findAll(node => node.props.accessibilityLabel === 'Tentar carregar contas novamente' && node.props.onPress)[0];
  await act(async () => button.props.onPress());
  expect(retry).toHaveBeenCalledTimes(1);
});

test('paginação mantém lançamentos existentes enquanto exibe skeleton no rodapé', async () => {
  useTransactions.mockReturnValue({ rows: [{ id: 'row', description: 'Mercado', date: '2026-10-06', type: 'EXPENSE', amount: 50, payment: 'Pix' }], loading: true, error: '', hasNext: true });
  await act(async () => { renderer = TestRenderer.create(<PagedTransactionList />); });
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === 'Mercado')).toBe(true);
  expect(busyGroups().some(node => node.props.accessibilityLabel === 'Carregando mais lançamentos')).toBe(true);
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});

test('salvar informa espera e bloqueia cliques duplicados sem spinner', async () => {
  await act(async () => { renderer = TestRenderer.create(<PrimaryButton title="Salvar" loading />); });
  const button = renderer.root.findAll(node => node.props.accessibilityLabel === 'Salvar')[0];
  expect(button.props.disabled).toBe(true);
  expect(button.props.accessibilityState.busy).toBe(true);
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});
