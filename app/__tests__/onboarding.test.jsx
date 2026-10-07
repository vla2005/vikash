import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { OnboardingProvider, useOnboarding } from '../src/contexts/OnboardingContext';
import RegisterScreen from '../src/screens/RegisterScreen';
import FormField from '../src/components/FormField';
import CreateAccountScreen from '../src/screens/CreateAccountScreen';
import FinancialInstitutionPicker from '../src/components/FinancialInstitutionPicker';
import LoginScreen from '../src/screens/LoginScreen';
import useToast from '../src/hooks/useToast';
jest.mock('../src/hooks/useToast', () => { const showToast = jest.fn(); return { __esModule: true, default: () => ({ showToast }) }; });
import AccountsSummaryScreen from '../src/screens/AccountsSummaryScreen';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/sessionStorage', () => ({ loadSession: jest.fn(async () => null), storeSession: jest.fn(async () => {}), clearSession: jest.fn(async () => {}) }));

jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Shape = props => ReactModule.createElement(View, props);
  return { __esModule: true, default: Shape, Svg: Shape, Path: Shape, Rect: Shape, Circle: Shape, Line: Shape, Polyline: Shape };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

let currentState;
function Observer() { currentState = useOnboarding(); return null; }
let renderer;
const originalFetch = global.fetch;
const navigation = { reset: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
const session = { accessToken: 'access-test', refreshToken: 'refresh-test', user: { name: 'Viktor Lucena', email: 'viktor@exemplo.com' } };
function response(data) { return { ok: true, json: async () => data }; }
function apiFetch(url, options) {
  if (url.endsWith('/auth/me')) { return Promise.resolve(response(session.user)); }
  if (url.includes('/auth/')) { return Promise.resolve(response(session)); }
  const request = JSON.parse(options.body);
  return Promise.resolve(response({ uuid: 'account-test-uuid', ...request, financialInstitution: request.financialInstitutionId ? { id: request.financialInstitutionId, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } : null }));
}
beforeEach(() => { global.fetch = jest.fn(apiFetch); });
afterEach(async () => { if (renderer) { await act(() => renderer.unmount()); } global.fetch = originalFetch; jest.clearAllMocks(); });

async function renderScreen(screen) {
  await act(() => { renderer = TestRenderer.create(<OnboardingProvider><Observer />{screen}</OnboardingProvider>); });
  if (screen?.type === CreateAccountScreen) {
    await act(() => currentState.register({ name: 'Viktor Lucena', email: 'viktor@exemplo.com', password: 'senha-segura' }));
    global.fetch.mockClear();
  }
}
function input(testID) { return renderer.root.findAllByType(TextInput).find(node => node.props.testID === testID); }
function button(label) { return renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]; }

test.each(['Ab1!', 'abcdef1!', 'Abcdefg!', 'Abcdefg1'])('cadastro bloqueia %s antes de enviar qualquer request', async password => {
  await renderScreen(<RegisterScreen navigation={navigation} />);
  await act(() => {
    input('register-name').props.onChangeText('Viktor Lucena');
    input('register-email').props.onChangeText('viktor@exemplo.com');
    input('register-password').props.onChangeText(password);
    input('register-confirm').props.onChangeText(password);
  });
  await act(() => button('Criar cadastro').props.onPress());
  expect(renderer.root.findAllByType(FormField).find(field => field.props.testID === 'register-password').props.error).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(navigation.reset).not.toHaveBeenCalled();
});

test('cadastro valido navega para primeira conta sem guardar a senha', async () => {
  await renderScreen(<RegisterScreen navigation={navigation} />);
  await act(() => { input('register-name').props.onChangeText('Viktor Lucena'); input('register-email').props.onChangeText('viktor@exemplo.com'); input('register-password').props.onChangeText('Senha123!'); input('register-confirm').props.onChangeText('Senha123!'); });
  await act(() => button('Criar cadastro').props.onPress());
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'AddFinancialItem' }] });
  expect(currentState.profile).toEqual(session.user);
  expect(currentState.session.accessToken).toBe('access-test');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/register', expect.objectContaining({ body: JSON.stringify({ name: 'Viktor Lucena', email: 'viktor@exemplo.com', password: 'Senha123!' }) }));
  expect(currentState.session.password).toBeUndefined();
  expect(input('register-password').props.value).toBe('');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Cadastro realizado!' }));
});
test('conta sem descricao nao avanca; conta valida envia JSON autenticado e usa o ID do banco', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  await act(() => button('Criar conta').props.onPress());
  expect(navigation.reset).not.toHaveBeenCalled();
  await act(() => { input('account-name').props.onChangeText('Itaú pessoal'); input('account-balance').props.onChangeText('935027'); button('Poupança').props.onPress(); });
  await act(() => button('Criar conta').props.onPress());
  expect(currentState.accounts).toHaveLength(1);
  expect(currentState.accounts[0]).toMatchObject({ name: 'Itaú pessoal', type: 'POUPANCA', balance: 9350.27 });
  expect(currentState.accounts[0].uuid).toBe('account-test-uuid');
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/account/create', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer access-test' }),
    body: JSON.stringify({ description: 'Itaú pessoal', type: 'POUPANCA', balance: 9350.27, financialInstitutionId: null }),
  }));
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Accounts' }] });
});
test('edicao nao simula sucesso sem endpoint de atualizacao', async () => {
  await renderScreen(null);
  await act(() => currentState.login({ email: 'viktor@exemplo.com', password: 'senha-segura' }));
  global.fetch.mockClear();
  global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ message: 'Endpoint não encontrado' }) });
  await act(async () => { await expect(currentState.saveAccount({ name: 'Itaú', type: 'CONTA_CORRENTE', balance: 10 }, 'account-uuid')).rejects.toMatchObject({ status: 404 }); });
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/account/update/account-uuid', expect.objectContaining({ method: 'PUT' }));
  expect(currentState.accounts).toHaveLength(0);
});

test('formulario de edicao preenche conta da listagem e preserva dados quando PUT falha', async () => {
  await renderScreen(null);
  await act(() => currentState.login({ email: 'viktor@exemplo.com', password: 'senha-segura' }));
  const account = { uuid: 'account-uuid', description: 'Reserva pessoal', type: 'POUPANCA', balance: -350.5, financialInstitution: { id: 42, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } };
  await act(() => renderer.update(<OnboardingProvider><Observer /><CreateAccountScreen navigation={navigation} route={{ params: { fromManagement: true, account } }} /></OnboardingProvider>));
  expect(input('account-name').props.value).toBe('Reserva pessoal');
  expect(input('account-balance').props.value).toContain('350,50');
  expect(button('Poupança').props.accessibilityState.checked).toBe(true);
  expect(renderer.root.findByType(FinancialInstitutionPicker).props.value).toBe(42);
  expect(renderer.root.findByType(FinancialInstitutionPicker).props.selectedInstitution).toEqual(account.financialInstitution);
  expect(button('Salvar alterações').props.disabled).toBe(false);
  global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ message: 'Endpoint não encontrado' }) });
  await act(() => input('account-name').props.onChangeText('Reserva atualizada'));
  await act(() => button('Salvar alterações').props.onPress());
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/account/update/account-uuid', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ description: 'Reserva atualizada', type: 'POUPANCA', balance: -350.5, financialInstitutionId: 42 }), headers: expect.objectContaining({ Authorization: 'Bearer access-test' }) }));
  expect(navigation.reset).not.toHaveBeenCalled();
  expect(input('account-name').props.value).toBe('Reserva atualizada');
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
});

test('edicao bem sucedida atualiza conta pelo UUID sem adicionar outra e exibe toast', async () => {
  await renderScreen(null);
  await act(() => currentState.login({ email: 'viktor@exemplo.com', password: 'senha-segura' }));
  await act(() => currentState.saveAccount({ name: 'Dinheiro', type: 'CARTEIRA', balance: 10 }));
  const account = currentState.accounts[0];
  await act(() => renderer.update(<OnboardingProvider><Observer /><CreateAccountScreen navigation={navigation} route={{ params: { account } }} /></OnboardingProvider>));
  global.fetch.mockClear();
  global.fetch.mockResolvedValue(response({ uuid: account.uuid, description: 'Carteira pessoal', type: 'CARTEIRA', balance: 10, financialInstitution: null }));
  await act(() => input('account-name').props.onChangeText('Carteira pessoal'));
  await act(() => button('Salvar alterações').props.onPress());
  expect(currentState.accounts).toHaveLength(1);
  expect(currentState.accounts[0]).toMatchObject({ uuid: account.uuid, name: 'Carteira pessoal' });
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Accounts' }] });
  expect(useToast().showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Conta atualizada!' }));
});

test('carteira oculta e nao salva instituicao; voltar a um tipo bancario restaura a escolha antes de salvar', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  await act(() => renderer.root.findByType(FinancialInstitutionPicker).props.onChange('itau'));
  await act(() => button('Carteira').props.onPress());
  expect(renderer.root.findAllByType(FinancialInstitutionPicker)).toHaveLength(0);
  await act(() => button('Conta corrente').props.onPress());
  expect(renderer.root.findByType(FinancialInstitutionPicker).props.value).toBe('itau');
  await act(() => {
    button('Carteira').props.onPress();
    input('account-name').props.onChangeText('Dinheiro de bolso');
  });
  await act(() => button('Criar conta').props.onPress());
  expect(currentState.accounts[0]).toMatchObject({ name: 'Dinheiro de bolso', type: 'CARTEIRA', financialInstitutionId: null });
});

test('busca instituicoes somente ao abrir seletor e salva o ID do banco com nome e logo', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  global.fetch.mockImplementation((url, options) => options.method === 'POST' ? apiFetch(url, options) : Promise.resolve(response([
    { id: 42, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' },
    { id: 80, name: 'Santander', logoUrl: '/images/financial-institutions/santander.webp' },
  ])));
  expect(global.fetch).not.toHaveBeenCalled();
  await act(async () => button('Selecionar instituição financeira').props.onPress());
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/institutions', expect.objectContaining({ method: 'GET' }));
  const search = renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Buscar instituição financeira');
  await act(() => search.props.onChangeText('itau'));
  expect(button('Santander')).toBeUndefined();
  await act(() => button('Itaú').props.onPress());
  await act(() => input('account-name').props.onChangeText('Dia a dia'));
  await act(() => button('Criar conta').props.onPress());
  expect(currentState.accounts[0]).toMatchObject({ financialInstitutionId: 42, financialInstitution: { id: 42, name: 'Itaú', logoUrl: '/images/financial-institutions/itau.webp' } });
});

test('erro da API nao vira lista local; tentar novamente recarrega instituicoes', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 500, name: 'Banco do teste', logoUrl: '/images/test.webp' }] });
  await act(async () => button('Selecionar instituição financeira').props.onPress());
  expect(button('Itaú')).toBeUndefined();
  expect(button('Banco do teste')).toBeUndefined();
  await act(async () => button('Tentar novamente').props.onPress());
  expect(button('Banco do teste')).toBeDefined();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('email duplicado mantem cadastro na tela e nao autentica', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'Email already exists' }) });
  await renderScreen(<RegisterScreen navigation={navigation} />);
  await act(() => { input('register-name').props.onChangeText('Viktor Lucena'); input('register-email').props.onChangeText('viktor@exemplo.com'); input('register-password').props.onChangeText('Senha123!'); input('register-confirm').props.onChangeText('Senha123!'); });
  await act(() => button('Criar cadastro').props.onPress());
  expect(navigation.reset).not.toHaveBeenCalled();
  expect(currentState.session).toBeNull();
  expect(renderer.root.findAll(node => node.props.message?.includes('já está cadastrado')).length).toBeGreaterThan(0);
});

test('falha ao criar conta preserva formulario e nao adiciona registro local', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => null });
  await act(() => input('account-name').props.onChangeText('Minha conta'));
  await act(() => button('Criar conta').props.onPress());
  expect(currentState.accounts).toHaveLength(0);
  expect(navigation.reset).not.toHaveBeenCalled();
  expect(input('account-name').props.value).toBe('Minha conta');
});

test('envios repetidos durante cadastro fazem somente uma requisicao', async () => {
  let finish;
  global.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await renderScreen(<RegisterScreen navigation={navigation} />);
  await act(() => { input('register-name').props.onChangeText('Viktor Lucena'); input('register-email').props.onChangeText('viktor@exemplo.com'); input('register-password').props.onChangeText('Senha123!'); input('register-confirm').props.onChangeText('Senha123!'); });
  let pending;
  await act(() => { const submit = button('Criar cadastro').props.onPress; pending = submit(); submit(); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(navigation.reset).not.toHaveBeenCalled();
  await act(async () => { global.fetch.mockImplementation(apiFetch); finish(response(session)); await pending; });
  expect(navigation.reset).toHaveBeenCalledTimes(1);
});

test('login usa endpoint real antes de liberar criacao de conta', async () => {
  await renderScreen(<LoginScreen navigation={navigation} />);
  await act(() => { input('login-email').props.onChangeText('viktor@exemplo.com'); input('login-password').props.onChangeText('senha-segura'); });
  await act(() => button('Entrar').props.onPress());
  expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/auth/login', expect.objectContaining({ method: 'POST' }));
  expect(currentState.session.accessToken).toBe('access-test');
  expect(input('login-password').props.value).toBe('');
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
});

test('concluir criacao das contas abre HOME', async () => {
  await renderScreen(<CreateAccountScreen navigation={navigation} route={{ params: {} }} />);
  await act(() => currentState.saveAccount({ name: 'Carteira', type: 'CARTEIRA', balance: 25 }));
  await act(() => renderer.update(<OnboardingProvider><Observer /><AccountsSummaryScreen navigation={navigation} /></OnboardingProvider>));
  await act(() => button('Começar a usar').props.onPress());
  expect(currentState.completed).toBe(true);
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
});
