import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import MainTabs from '../src/navigation/MainTabs';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
import BottomNavigator from '../src/components/BottomNavigator';
import VoiceDrawer from '../src/components/VoiceDrawer';
import { createCreditCard, updateCreditCard, fetchCreditCards, fetchCreditCardDetails } from '../src/services/creditCards';
import { fetchFinancialInstitutions } from '../src/services/financialInstitutions';
jest.mock('../src/services/creditCards', () => ({ createCreditCard: jest.fn(), updateCreditCard: jest.fn(), fetchCreditCards: jest.fn(), fetchCreditCardDetails: jest.fn() }));
jest.mock('../src/services/financialInstitutions', () => ({ fetchFinancialInstitutions: jest.fn() }));
import { createTransaction } from '../src/services/transactions';
jest.mock('../src/services/transactions', () => ({ createTransaction: jest.fn(), fetchTransactions: jest.fn(async () => ({ rows: [], page: 0, hasNext: false })) }));
import { fetchAccounts, fetchAccountDetails } from '../src/services/accounts';
jest.mock('../src/services/accounts', () => ({ fetchAccounts: jest.fn(), fetchAccountDetails: jest.fn(), createAccount: jest.fn() }));
import useToast from '../src/hooks/useToast';
jest.mock('../src/hooks/useToast', () => { const showToast = jest.fn(); return { __esModule: true, default: () => ({ showToast }) }; });
import { createCategory, fetchCategories, updateCategory } from '../src/services/categories';

jest.mock('../src/services/categories', () => ({ createCategory: jest.fn(async values => ({ ...values })), fetchCategories: jest.fn(), updateCategory: jest.fn(async () => null) }));
jest.mock('../src/contexts/OnboardingContext', () => ({ useOnboarding: () => ({ session: { accessToken: 'test-access' }, profile: { name: 'Viktor Lucena' }, accounts: [] }) }));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock('react-native-svg', () => {
  const ReactModule = require('react'); const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Ellipse: Shape, Line: Shape, Polyline: Shape };
});
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('../src/services/speechRecognition', () => ({ createSpeechRecognition: () => { throw new Error('Transcrição indisponível neste dispositivo.'); } }));

let renderer;
beforeEach(() => {
  createCreditCard.mockReset();
  updateCreditCard.mockReset();
  fetchCreditCards.mockReset();
  fetchCreditCards.mockResolvedValue([]);
  fetchCreditCardDetails.mockReset();
  fetchFinancialInstitutions.mockReset();
  fetchFinancialInstitutions.mockResolvedValue([{ id: 42, name: 'Inter', logoUrl: '/images/financial-institutions/inter.webp' }]);
  createTransaction.mockReset();
  useToast().showToast.mockClear();
  fetchAccounts.mockReset();
  fetchAccounts.mockResolvedValue([]);
  fetchAccountDetails.mockReset();
  fetchCategories.mockReset();
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [] });
});

test('confirmacao envia transcricao com token e mostra sucesso somente depois de salvar', async () => {
  createTransaction.mockResolvedValue({ uuid: 'saved' });
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Registrar por voz').props.onPress());
  expect(createTransaction).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(VoiceDrawer).props.onConfirm('Texto revisado'));
  expect(createTransaction).toHaveBeenCalledWith('Texto revisado', 'test-access');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Transação registrada!' }));
});

test('falha ao salvar mostra toast e propaga erro para manter a revisao', async () => {
  createTransaction.mockRejectedValue(new Error('Falha ao salvar'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => {
    await expect(renderer.root.findByType(VoiceDrawer).props.onConfirm('Texto revisado')).rejects.toThrow('Falha ao salvar');
  });
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Falha ao salvar' }));
});
afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); } });
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }
function labels() { return renderer.root.findAllByType(Text).map(node => node.props.children); }

test('as quatro abas mudam o conteudo e mantem a barra com estado selecionado', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  expect(labels()).toContain('HOME');
  for (const [tab, heading] of [['Extrato', 'Extrato'], ['Contas', 'Contas'], ['Categorias', 'Categorias'], ['Início', 'HOME']]) {
    await act(async () => button(tab).props.onPress());
    expect(labels()).toContain(heading);
    expect(button(tab).props.accessibilityState.selected).toBe(true);
    expect(renderer.root.findAllByType(BottomNavigator)).toHaveLength(1);
    expect(button('Registrar por voz')).toBeDefined();
  }
});

test('microfone abre e fecha drawer sem mudar a aba e informa captura indisponivel', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Extrato').props.onPress());
  await act(async () => button('Registrar por voz').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(true);
  expect(renderer.root.findByType(BottomNavigator).props.selected).toBe('Statement');
  expect(labels()).toContain('Transcrição indisponível neste dispositivo.');
  await act(async () => button('Fechar microfone').props.onPress());
  expect(renderer.root.findByType(VoiceDrawer).props.visible).toBe(false);
  expect(button('Extrato').props.accessibilityState.selected).toBe(true);
});

test('contas consulta ao abrir, soma saldo e abre o formulario direto pelo botao', async () => {
  fetchAccounts.mockResolvedValue([
    { uuid: 'one', description: 'Itaú', type: 'CONTA_CORRENTE', balance: 9350, financialInstitution: { id: 1, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } },
    { uuid: 'two', description: 'Santander', type: 'POUPANCA', balance: 5500, financialInstitution: null },
    { uuid: 'three', description: 'Dinheiro', type: 'CARTEIRA', balance: 0, financialInstitution: null },
  ]);
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  expect(fetchAccounts).not.toHaveBeenCalled();
  await act(async () => button('Contas').props.onPress());
  expect(fetchAccounts).toHaveBeenCalledWith('test-access', expect.anything());
  expect(labels()).toContain('Itaú');
  expect(labels()).toContain('Carteira');
  const total = renderer.root.findAll(node => node.props.accessibilityLabel === 'Saldo total em contas')[0];
  expect(total.props.children.replace(/\s/g, '')).toBe('R$14.850,00');
  await act(async () => button('Nova conta').props.onPress());
  expect(labels()).toContain('Onde seu dinheiro fica?');
  expect(renderer.root.findAllByType(BottomNavigator)).toHaveLength(0);
  await act(async () => button('Voltar às contas').props.onPress());
  expect(fetchAccounts).toHaveBeenCalledTimes(2);
  await act(async () => button('Início').props.onPress());
  await act(async () => button('Contas').props.onPress());
  expect(fetchAccounts).toHaveBeenCalledTimes(3);
});

test('cartao valida dias, envia ID real e preserva dados na falha antes de voltar no sucesso', async () => {
  const requests = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Não deveria consultar API'));
  try {
    await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
    await act(async () => button('Contas').props.onPress());
    await act(async () => button('Novo cartão').props.onPress());
    expect(labels()).toContain('Seu cartão de crédito.');
    await act(async () => button('Criar cartão').props.onPress());
    expect(labels()).toContain('Informe uma descrição para seu cartão.');
    const input = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
    await act(async () => input('Descrição').props.onChangeText('Meu cartão Inter'));
    await act(async () => input('Limite de crédito').props.onChangeText('500000'));
    await act(async () => button('Selecionar instituição financeira').props.onPress());
    await act(async () => button('Inter').props.onPress());
    await act(async () => input('Fechamento').props.onChangeText('0'));
    await act(async () => input('Vencimento').props.onChangeText('32'));
    await act(async () => button('Criar cartão').props.onPress());
    expect(labels()).toContain('Informe um dia entre 1 e 31.');
    expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'warn' }));
    expect(createCreditCard).not.toHaveBeenCalled();
    await act(async () => input('Fechamento').props.onChangeText('1'));
    await act(async () => input('Vencimento').props.onChangeText('31'));
    createCreditCard.mockRejectedValueOnce(new Error('Falha de conexão'));
    await act(async () => button('Criar cartão').props.onPress());
    expect(createCreditCard).toHaveBeenCalledWith({ financialInstitutionId: 42, description: 'Meu cartão Inter', creditLimit: 5000, closingDay: 1, dueDay: 31 }, 'test-access');
    expect(labels()).toContain('Falha de conexão');
    expect(input('Descrição').props.value).toBe('Meu cartão Inter');
    expect(requests).not.toHaveBeenCalled();
    createCreditCard.mockResolvedValueOnce({ uuid: 'saved-card' });
    await act(async () => button('Criar cartão').props.onPress());
    expect(useToast().showToast).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'success', title: 'Cartão criado!' }));
    expect(labels()).toContain('Contas');
  } finally { requests.mockRestore(); }
});

test('contas permite tentar novamente apos erro e mostra vazio sem mocks', async () => {
  fetchAccounts.mockRejectedValueOnce(new Error('Falha de conexão'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Contas').props.onPress());
  expect(labels()).toContain('Falha de conexão');
  expect(labels()).not.toContain('Suas contas começam aqui');
  await act(async () => button('Tentar carregar contas novamente').props.onPress());
  expect(labels()).toContain('Suas contas começam aqui');
});

test('cartoes consultam dados reais, nao somam limite ao saldo e abrem os detalhes da fatura', async () => {
  fetchAccounts.mockResolvedValue([{ uuid: 'account', description: 'Minha conta', type: 'CONTA_CORRENTE', balance: 2000, financialInstitution: null }]);
  fetchCreditCards.mockResolvedValue([{ uuid: 'card', description: 'Meu cartão Inter', creditLimit: 5000, availableLimit: 4400, financialInstitution: { name: 'Inter', logoUrl: '/images/financial-institutions/inter.webp' }, currentInvoice: { uuid: 'invoice', referenceMonth: '2026-10', closingDate: '2026-10-03', dueDate: '2026-10-10', status: 'OPEN', total: 600 } }]);
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  expect(fetchCreditCards).not.toHaveBeenCalled();
  await act(async () => button('Contas').props.onPress());
  expect(fetchCreditCards).toHaveBeenCalledWith('test-access', expect.anything());
  expect(labels()).toContain('Contas e cartões');
  const total = renderer.root.findAll(node => node.props.accessibilityLabel === 'Saldo total em contas')[0];
  expect(total.props.children.replace(/\s/g, '')).toBe('R$2.000,00');
  fetchCreditCardDetails.mockResolvedValue({ uuid: 'card', description: 'Meu cartão Inter', creditLimit: 5000, availableLimit: 4400, closingDay: 3, dueDay: 10, financialInstitution: { name: 'Inter' }, currentInvoiceUuid: 'invoice', invoices: [{ uuid: 'invoice', referenceMonth: '2026-10', total: 600, status: 'OPEN', closingDate: '2026-10-03', dueDate: '2026-10-10' }] });
  await act(async () => button('Abrir cartão Meu cartão Inter').props.onPress());
  expect(fetchCreditCardDetails).toHaveBeenCalledWith('card', 'test-access', expect.anything());
  expect(labels()).toContain('Detalhes do cartão');
  expect(labels()).toContain('Compras da fatura');
  await act(async () => button('Voltar para contas e cartões').props.onPress());
  await act(async () => renderer.root.findByType(VoiceDrawer).props.onConfirm('Comprei no crédito'));
  expect(fetchCreditCards).toHaveBeenCalledTimes(3);
});

test('lapis abre cartao preenchido e atualiza sem criar outro cartao', async () => {
  const card = { uuid: 'card', description: 'Meu cartão Inter', creditLimit: 5000, availableLimit: 5000, closingDay: 3, dueDay: 10, financialInstitution: { id: 42, name: 'Inter' }, currentInvoice: null, invoices: [] };
  fetchCreditCards.mockResolvedValue([card]);
  fetchCreditCardDetails.mockResolvedValue(card);
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Contas').props.onPress());
  await act(async () => button('Abrir cartão Meu cartão Inter').props.onPress());
  await act(async () => button('Editar cartão').props.onPress());
  expect(labels()).toContain('Editar seu cartão.');
  const input = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  expect(input('Descrição').props.value).toBe('Meu cartão Inter');
  expect(input('Fechamento').props.value).toBe('3');
  expect(input('Vencimento').props.value).toBe('10');
  await act(async () => input('Descrição').props.onChangeText('Inter principal'));
  updateCreditCard.mockRejectedValueOnce(new Error('Falha ao atualizar'));
  await act(async () => button('Salvar alterações').props.onPress());
  expect(input('Descrição').props.value).toBe('Inter principal');
  updateCreditCard.mockResolvedValueOnce({ ...card, description: 'Inter principal' });
  fetchCreditCardDetails.mockResolvedValue({ ...card, description: 'Inter principal' });
  await act(async () => button('Salvar alterações').props.onPress());
  expect(updateCreditCard).toHaveBeenLastCalledWith('card', { description: 'Inter principal', financialInstitutionId: 42, creditLimit: 5000, closingDay: 3, dueDay: 10 }, 'test-access');
  expect(createCreditCard).not.toHaveBeenCalled();
  expect(labels()).toContain('Detalhes do cartão');
  expect(labels()).toContain('Inter principal');
});

test('tocar conta abre o mesmo formulario preenchido usando dados do GET', async () => {
  const account = { uuid: 'one', description: 'Conta do dia a dia', type: 'CONTA_CORRENTE', balance: 9350, financialInstitution: { id: 42, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } };
  fetchAccounts.mockResolvedValue([account]);
  fetchAccountDetails.mockResolvedValue(account);
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Contas').props.onPress());
  await act(async () => button('Abrir conta Conta do dia a dia').props.onPress());
  expect(fetchAccountDetails).toHaveBeenCalledWith('one', 'test-access', expect.anything());
  expect(labels()).toContain('Detalhes da conta');
  expect(labels()).toContain('Transações da conta');
  await act(async () => button('Editar conta').props.onPress());
  expect(labels()).toContain('Editar sua conta.');
  const input = renderer.root.findAll(node => node.props.testID === 'account-name' && typeof node.props.onChangeText === 'function')[0];
  expect(input.props.value).toBe('Conta do dia a dia');
  expect(button('Salvar alterações').props.disabled).toBe(false);
  await act(async () => button('Voltar às contas').props.onPress());
  expect(labels()).toContain('Detalhes da conta');
  await act(async () => button('Voltar para contas e cartões').props.onPress());
  expect(fetchAccounts).toHaveBeenCalledTimes(2);
});

test('cria e edita categoria pela API usando UUID e consulta novamente a listagem', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Informe um nome com pelo menos 2 caracteres.');
  const input = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input('Nome da categoria').props.onChangeText('Pets'));
  await act(async () => button('Ícone Pets').props.onPress());
  await act(async () => button('Cor Azul').props.onPress());
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [{ uuid: 'a446ab36-bd34-42db-a899-cb5ddab93f09', name: 'Pets', icon: 'paw', color: 'blue' }] });
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Pets');
  expect(createCategory).toHaveBeenCalledWith({ name: 'Pets', icon: 'paw', color: 'blue' }, 'test-access');
  await act(async () => button('Editar categoria Pets').props.onPress());
  expect(input('Nome da categoria').props.value).toBe('Pets');
  expect(button('Ícone Pets').props.accessibilityState.selected).toBe(true);
  expect(button('Cor Azul').props.accessibilityState.selected).toBe(true);
  await act(async () => input('Nome da categoria').props.onChangeText('Saude'));
  await act(async () => button('Salvar categoria').props.onPress());
  expect(labels()).toContain('Já existe uma categoria com esse nome.');
  await act(async () => input('Nome da categoria').props.onChangeText('Meus pets'));
  updateCategory.mockRejectedValueOnce(new Error('Falha ao atualizar'));
  await act(async () => button('Salvar categoria').props.onPress());
  expect(labels()).toContain('Falha ao atualizar');
  expect(input('Nome da categoria').props.value).toBe('Meus pets');
  fetchCategories.mockResolvedValue({ defaultCategories: [{ name: 'Saúde', icon: 'health', color: 'sage' }, { name: 'Mercado', icon: 'basket', color: 'ochre' }], customCategories: [{ uuid: 'a446ab36-bd34-42db-a899-cb5ddab93f09', name: 'Meus pets', icon: 'paw', color: 'blue' }] });
  await act(async () => button('Salvar categoria').props.onPress());
  expect(updateCategory).toHaveBeenCalledWith('a446ab36-bd34-42db-a899-cb5ddab93f09', { name: 'Meus pets', icon: 'paw', color: 'blue' }, 'test-access');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Categoria atualizada!' }));
  await act(async () => input('Buscar categoria').props.onChangeText('PETS'));
  expect(labels()).toContain('Meus pets');
  expect(labels()).not.toContain('Mercado');
  await act(async () => input('Buscar categoria').props.onChangeText('saude'));
  expect(labels()).toContain('Saúde');
  expect(labels()).not.toContain('Pets');
});

test('falha de rede mantem o formulario aberto com os dados para tentar novamente', async () => {
  createCategory.mockRejectedValueOnce(new Error('Falha de conexão'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  const input = renderer.root.findAll(node => node.props.accessibilityLabel === 'Nome da categoria' && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText('Viagens'));
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Falha de conexão');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'Falha de conexão' }));
  expect(labels()).toContain('Nova categoria');
  fetchCategories.mockResolvedValue({ defaultCategories: [], customCategories: [{ name: 'Viagens', icon: 'paw', color: 'sage' }] });
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).toContain('Viagens');
  expect(labels()).not.toContain('Nova categoria');
});

test('resposta do POST nao entra na lista quando GET nao retorna a categoria', async () => {
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  await act(async () => button('Criar categoria').props.onPress());
  const input = renderer.root.findAll(node => node.props.accessibilityLabel === 'Nome da categoria' && typeof node.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText('Nao consultada'));
  await act(async () => button('Criar categoria').props.onPress());
  expect(labels()).not.toContain('Nao consultada');
  expect(fetchCategories).toHaveBeenCalledTimes(2);
});

test('falha da consulta mostra erro sem categorias padrao locais', async () => {
  fetchCategories.mockRejectedValueOnce(new Error('Consulta indisponível'));
  await act(async () => { renderer = TestRenderer.create(<MainTabs />); });
  await act(async () => button('Categorias').props.onPress());
  expect(labels()).toContain('Consulta indisponível');
  expect(labels()).not.toContain('Saúde');
  expect(labels()).not.toContain('Mercado');
});
