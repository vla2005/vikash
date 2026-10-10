import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import EditTransactionScreen from '../src/screens/EditTransactionScreen';
import SelectionField from '../src/components/SelectionField';
import { updateTransaction } from '../src/services/transactions';
import { fetchAccounts } from '../src/services/accounts';
import { fetchCreditCards } from '../src/services/creditCards';
import { fetchCategories } from '../src/services/categories';
import useToast from '../src/hooks/useToast';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/transactions', () => ({ updateTransaction: jest.fn() }));
jest.mock('../src/services/accounts', () => ({ fetchAccounts: jest.fn() }));
jest.mock('../src/services/creditCards', () => ({ fetchCreditCards: jest.fn() }));
jest.mock('../src/services/categories', () => ({ fetchCategories: jest.fn() }));
jest.mock('../src/hooks/useToast', () => { const showToast = jest.fn(); return { __esModule: true, default: () => ({ showToast }) }; });
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape, Polyline: Shape };
});

const account = { uuid: 'account', description: 'Carteira' };
const card = { uuid: 'card', description: 'Meu cartão', financialInstitution: { id: 1, name: 'Inter' } };
const details = { uuid: 'entry', description: 'Mercado', amount: 50, paymentMethod: 'PIX', type: 'EXPENSE', account,
  category: { name: 'Mercado', icon: 'basket', color: 'ochre' } };
const purchase = { ...details, account: null, creditCard: card, installmentCount: 3,
  installments: [{ status: 'OPEN' }, { status: 'CLOSED' }, { status: 'OPEN' }] };
let renderer;
let onSaved;
let onBack;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const input = id => renderer.root.findAll(node => node.props.testID === id && typeof node.props.onChangeText === 'function')[0];
const select = label => renderer.root.findAllByType(SelectionField).find(node => node.props.label === label);
const text = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' ');
async function open(data = details, isPurchase = false) {
  await act(async () => { renderer = TestRenderer.create(<EditTransactionScreen details={data} purchase={isPurchase} accessToken="token" onSaved={onSaved} onBack={onBack} />); });
}
beforeEach(() => {
  jest.clearAllMocks(); onSaved = jest.fn(); onBack = jest.fn();
  fetchAccounts.mockResolvedValue([account, { uuid: 'next', description: 'Outra conta' }]);
  fetchCreditCards.mockResolvedValue([card, { ...card, uuid: 'next-card', description: 'Outro cartão' }]);
  fetchCategories.mockResolvedValue({ defaultCategories: [details.category], customCategories: [{ uuid: 'custom', name: 'Pets', icon: 'paw', color: 'blue' }] });
  updateTransaction.mockResolvedValue(null);
});
afterEach(async () => { await act(async () => renderer?.unmount()); });

test('preenche os dados existentes e envia descrição, categoria, valor e nova conta', async () => {
  await open();
  expect(input('edit-entry-description').props.value).toBe('Mercado');
  expect(select('Categoria').props.value).toBe('default:Mercado');
  await act(async () => {
    input('edit-entry-description').props.onChangeText(' Compra corrigida ');
    input('edit-entry-amount').props.onChangeText('7500');
    select('Categoria').props.onChange('custom:custom');
    select('Conta').props.onChange('next');
    select('Forma de pagamento').props.onChange('DEBIT_CARD');
  });
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateTransaction).toHaveBeenCalledWith('entry', {
    description: 'Compra corrigida', amount: 75, paymentMethod: 'DEBIT_CARD', accountUuid: 'next',
    creditCardUuid: null, destinationAccountUuid: null, defaultCategoryName: null, customCategoryUuid: 'custom',
  }, 'token', false);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test('ao mudar para crédito exige cartão e envia apenas o recurso escolhido', async () => {
  await open();
  await act(async () => select('Forma de pagamento').props.onChange('CREDIT_CARD'));
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateTransaction).not.toHaveBeenCalled(); expect(text()).toContain('Selecione o cartão.');
  await act(async () => select('Cartão de crédito').props.onChange('card'));
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateTransaction).toHaveBeenCalledWith('entry', expect.objectContaining({ paymentMethod: 'CREDIT_CARD', accountUuid: null, creditCardUuid: 'card' }), 'token', false);
});

test('permite mudar o cartão de uma compra e informa que o parcelamento é preservado', async () => {
  await open(purchase, true);
  await act(async () => select('Cartão de crédito').props.onChange('next-card'));
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateTransaction).toHaveBeenCalledWith('entry', expect.objectContaining({ creditCardUuid: 'next-card', accountUuid: null }), 'token', true);
  expect(text()).toContain('3 parcelas');
});

test('conversão de compra para saída avisa sobre remover todas as parcelas e usa conta', async () => {
  await open(purchase, true);
  await act(async () => { select('Forma de pagamento').props.onChange('PIX'); });
  expect(text()).toContain('Todas as parcelas serão retiradas');
  await act(async () => select('Conta').props.onChange('account'));
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateTransaction).toHaveBeenCalledWith('entry', expect.objectContaining({ paymentMethod: 'PIX', accountUuid: 'account', creditCardUuid: null }), 'token', true);
});

test('parcelas pagas deixam somente descrição e categoria disponíveis para edição', async () => {
  await open({ ...purchase, installments: [{ status: 'PAID' }] }, true);
  expect(input('edit-entry-amount').props.editable).toBe(false);
  expect(select('Cartão de crédito').props.disabled).toBe(true);
  expect(select('Forma de pagamento').props.disabled).toBe(true);
  expect(select('Categoria').props.disabled).toBe(false);
});

test('erros da API aparecem abaixo do campo e toast tem mensagem genérica', async () => {
  updateTransaction.mockRejectedValue({ message: 'Valor inválido.', fieldErrors: { amount: 'Corrija o valor.' } });
  await open(); await act(async () => button('Salvar alterações').props.onPress());
  expect(text()).toContain('Corrija o valor.'); expect(onSaved).not.toHaveBeenCalled();
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Não foi possível salvar. Confira os dados e tente novamente.' }));
});

test('bloqueia envio duplicado e cancelar não envia a edição', async () => {
  let resolve;
  updateTransaction.mockImplementation(() => new Promise(done => { resolve = done; }));
  await open();
  await act(async () => button('Cancelar edição').props.onPress()); expect(onBack).toHaveBeenCalledTimes(1); expect(updateTransaction).not.toHaveBeenCalled();
  let first;
  await act(async () => { first = button('Salvar alterações').props.onPress(); button('Salvar alterações').props.onPress(); });
  expect(updateTransaction).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(); await first; }); expect(onSaved).toHaveBeenCalledTimes(1);
});

test('falha ao carregar opções impede salvar e pode ser repetida', async () => {
  fetchAccounts.mockRejectedValueOnce(new Error('Falha ao carregar contas.'));
  await open(); expect(button('Salvar alterações').props.disabled).toBe(true);
  await act(async () => button('Salvar alterações').props.onPress()); expect(updateTransaction).not.toHaveBeenCalled();
  await act(async () => button('Tentar novamente').props.onPress()); expect(select('Conta')).toBeTruthy();
});
