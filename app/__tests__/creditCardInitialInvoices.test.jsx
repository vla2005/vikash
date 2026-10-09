import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import CreateCreditCardScreen from '../src/screens/CreateCreditCardScreen';
import CreditCardInitialInvoicesScreen from '../src/screens/CreditCardInitialInvoicesScreen';
import FormField from '../src/components/FormField';
import FinancialInstitutionPicker from '../src/components/FinancialInstitutionPicker';
import useCreditCardDetails from '../src/hooks/useCreditCardDetails';
import { createCreditCard, distributeCreditCardInitialInvoices, updateCreditCard } from '../src/services/creditCards';

jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

jest.mock('../src/contexts/OnboardingContext', () => ({ useOnboarding: () => ({ session: { accessToken: 'token' } }) }));
jest.mock('../src/hooks/useToast', () => ({ __esModule: true, default: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/hooks/useCreditCardDetails', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../src/services/creditCards', () => ({ createCreditCard: jest.fn(), distributeCreditCardInitialInvoices: jest.fn(), updateCreditCard: jest.fn() }));
jest.mock('../src/components/FinancialInstitutionPicker', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  return props => ReactModule.createElement(View, props);
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});

const card = { uuid: 'card', description: 'Meu cartão Inter', financialInstitution: { id: 42, name: 'Inter' },
  creditLimit: 5000, availableLimit: 2800, unallocatedUsedLimit: 2200, initialCommittedAmount: 2200,
  closingDay: 3, dueDay: 10, invoices: [] };
const onBack = jest.fn(); const onSaved = jest.fn();
let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const input = id => renderer.root.findAllByType(TextInput).find(node => node.props.testID === id);
const text = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().filter(item => typeof item !== 'object').join('')).join(' ');
const amountInputs = () => renderer.root.findAllByType(TextInput).filter(node => node.props.testID?.startsWith('initial-amount-'));

beforeEach(() => {
  jest.clearAllMocks();
  useCreditCardDetails.mockReturnValue({ card, loading: false, error: '', retry: jest.fn() });
});
afterEach(async () => { await act(async () => renderer?.unmount()); });
async function open() { await act(async () => { renderer = TestRenderer.create(<CreditCardInitialInvoicesScreen uuid="card" accessToken="token" onBack={onBack} onSaved={onSaved} />); }); }

async function createForm() {
  await act(async () => { renderer = TestRenderer.create(<CreateCreditCardScreen onCreated={onSaved} onCancel={onBack} />); });
  await act(async () => {
    renderer.root.findByType(FinancialInstitutionPicker).props.onChange(42, card.financialInstitution);
    input('card-description').props.onChangeText('Meu Inter');
    input('card-limit').props.onChangeText('500000');
    input('card-closing-day').props.onChangeText('3');
    input('card-due-day').props.onChangeText('10');
  });
}

test('cadastro calcula o comprometido e envia limite disponível zero sem substituir pelo total', async () => {
  await createForm();
  expect(input('card-available-limit').props.value).toContain('5.000,00');
  await act(async () => input('card-available-limit').props.onChangeText('0'));
  await act(async () => input('card-limit').props.onChangeText('600000'));
  expect(input('card-available-limit').props.value).toContain('0,00');
  expect(text()).toContain('6.000,00');
  await act(async () => button('Criar cartão').props.onPress());
  expect(createCreditCard).toHaveBeenCalledWith(expect.objectContaining({ availableLimit: 0, creditLimit: 6000 }), 'token');
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test('cadastro bloqueia disponível acima do total e mostra erro de servidor no campo correto', async () => {
  await createForm();
  await act(async () => input('card-available-limit').props.onChangeText('500001'));
  await act(async () => button('Criar cartão').props.onPress());
  expect(createCreditCard).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(FormField).find(field => field.props.testID === 'card-available-limit').props.error).toBeTruthy();
  await act(async () => input('card-available-limit').props.onChangeText('280000'));
  createCreditCard.mockRejectedValueOnce({ message: 'Confira os campos.', fieldErrors: { availableLimit: 'Limite inválido.' } });
  await act(async () => button('Criar cartão').props.onPress());
  expect(text()).toContain('Limite inválido.');
  expect(onSaved).not.toHaveBeenCalled();
});

test('edição não altera o disponível ou o saldo inicial reservado', async () => {
  await act(async () => { renderer = TestRenderer.create(<CreateCreditCardScreen card={card} onCreated={onSaved} onCancel={onBack} />); });
  expect(input('card-available-limit')).toBeUndefined();
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateCreditCard).toHaveBeenCalledWith('card', { financialInstitutionId: 42, description: card.description, creditLimit: 5000, closingDay: 3, dueDay: 10 }, 'token');
});

test('distribuição parcial envia datas e valor absoluto; continuar depois não envia nada', async () => {
  await open();
  await act(async () => button('Continuar depois').props.onPress());
  expect(onBack).toHaveBeenCalled();
  expect(distributeCreditCardInitialInvoices).not.toHaveBeenCalled();
  await act(async () => button('Adicionar fatura').props.onPress());
  await act(async () => amountInputs()[0].props.onChangeText('80000'));
  expect(text()).toContain('1.400,00');
  await act(async () => button('Salvar distribuição').props.onPress());
  expect(distributeCreditCardInitialInvoices).toHaveBeenCalledWith('card', [expect.objectContaining({ initialAmount: 800, closingDate: expect.stringMatching(/^\d{4}-\d{2}-03$/), dueDate: expect.stringMatching(/^\d{4}-\d{2}-10$/) })], 'token');
  expect(onSaved).toHaveBeenCalledTimes(1);
});

test('erro mantém dados, exibe mensagem no input e bloqueia distribuição excessiva', async () => {
  await open();
  await act(async () => button('Adicionar fatura').props.onPress());
  await act(async () => amountInputs()[0].props.onChangeText('220001'));
  await act(async () => button('Salvar distribuição').props.onPress());
  expect(distributeCreditCardInitialInvoices).not.toHaveBeenCalled();
  expect(text()).toContain('ultrapassa');
  await act(async () => amountInputs()[0].props.onChangeText('80000'));
  distributeCreditCardInitialInvoices.mockRejectedValueOnce({ message: 'Confira os campos.', fieldErrors: { 'invoices[0].initialAmount': 'Valor inválido.' } });
  await act(async () => button('Salvar distribuição').props.onPress());
  expect(text()).toContain('Valor inválido.');
  expect(amountInputs()[0].props.value).toContain('800,00');
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => button('Salvar distribuição').props.onPress());
  expect(distributeCreditCardInitialInvoices).toHaveBeenCalledTimes(2);
});

test('correção pode zerar fatura existente sem enviar faturas pagas ou valores inalterados', async () => {
  const invoice = (uuid, referenceMonth, status, initialAmount) => ({ uuid, referenceMonth, status, initialAmount, total: initialAmount + 100, closingDate: `${referenceMonth}-03`, dueDate: `${referenceMonth}-10` });
  useCreditCardDetails.mockReturnValue({ card: { ...card, unallocatedUsedLimit: 0, invoices: [invoice('old', '2026-10', 'CLOSED', 1500), invoice('unchanged', '2026-11', 'OPEN', 700), invoice('paid', '2026-09', 'PAID', 800)] }, loading: false });
  await open();
  expect(amountInputs()).toHaveLength(2);
  await act(async () => button('Zerar valor inicial de Outubro 2026').props.onPress());
  expect(text()).toContain('As compras permanecem');
  await act(async () => button('Salvar distribuição').props.onPress());
  expect(distributeCreditCardInitialInvoices).toHaveBeenCalledWith('card', [{ referenceMonth: '2026-10', initialAmount: 0, closingDate: '2026-10-03', dueDate: '2026-10-10' }], 'token');
});

test('erro da API pertence à fatura enviada quando outras faturas não mudaram', async () => {
  useCreditCardDetails.mockReturnValue({ card: { ...card, invoices: [
    { uuid: 'first', referenceMonth: '2026-10', status: 'CLOSED', initialAmount: 800, closingDate: '2026-10-03', dueDate: '2026-10-10' },
    { uuid: 'second', referenceMonth: '2026-11', status: 'OPEN', initialAmount: 700, closingDate: '2026-11-03', dueDate: '2026-11-10' },
  ] }, loading: false });
  await open();
  await act(async () => input('initial-amount-second').props.onChangeText('90000'));
  distributeCreditCardInitialInvoices.mockRejectedValueOnce({ message: 'Confira os campos.', fieldErrors: { 'invoices[0].initialAmount': 'Confira o valor de novembro.' } });
  await act(async () => button('Salvar distribuição').props.onPress());
  const fields = renderer.root.findAllByType(FormField);
  expect(fields.find(field => field.props.testID === 'initial-amount-second').props.error).toBe('Confira o valor de novembro.');
  expect(fields.find(field => field.props.testID === 'initial-amount-first').props.error).toBeUndefined();
  expect(distributeCreditCardInitialInvoices).toHaveBeenCalledWith('card', [expect.objectContaining({ referenceMonth: '2026-11', initialAmount: 900 })], 'token');
});

test('skeleton aguarda GET e requisição pendente impede duplo envio', async () => {
  useCreditCardDetails.mockReturnValue({ card: null, loading: true });
  await open();
  expect(button('Salvar distribuição')).toBeUndefined();
  useCreditCardDetails.mockReturnValue({ card, loading: false });
  await act(async () => renderer.update(<CreditCardInitialInvoicesScreen uuid="card" accessToken="token" onBack={onBack} onSaved={onSaved} />));
  await act(async () => button('Adicionar fatura').props.onPress());
  await act(async () => amountInputs()[0].props.onChangeText('80000'));
  let resolve;
  distributeCreditCardInitialInvoices.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const submit = button('Salvar distribuição').props.onPress;
  await act(async () => { submit(); submit(); });
  expect(distributeCreditCardInitialInvoices).toHaveBeenCalledTimes(1);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => resolve(null));
  expect(onSaved).toHaveBeenCalledTimes(1);
});
