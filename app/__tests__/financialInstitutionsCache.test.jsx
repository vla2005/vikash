import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import useFinancialInstitutions from '../src/hooks/useFinancialInstitutions';
import { fetchFinancialInstitutions } from '../src/services/financialInstitutions';
import { useOnboarding } from '../src/contexts/OnboardingContext';

jest.mock('../src/contexts/OnboardingContext', () => ({ useOnboarding: jest.fn() }));
jest.mock('../src/services/financialInstitutions', () => ({ fetchFinancialInstitutions: jest.fn() }));

const catalog = [{ id: 41, name: 'BRB' }];
let renderer;
let result;
let now;

function Picker({ visible }) {
  result = useFinancialInstitutions(visible);
  return null;
}

async function show(visible) {
  await act(async () => {
    if (renderer) { renderer.update(<Picker visible={visible} />); }
    else { renderer = TestRenderer.create(<Picker visible={visible} />); }
  });
}

beforeEach(() => {
  now = 1000000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useOnboarding.mockReturnValue({ session: { accessToken: 'profile-a' } });
  fetchFinancialInstitutions.mockReset().mockResolvedValue(catalog);
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  jest.restoreAllMocks();
});

test('três aberturas reutilizam uma consulta e a expiração atualiza o catálogo', async () => {
  await show(true);
  for (let index = 0; index < 2; index++) { await show(false); await show(true); }
  expect(fetchFinancialInstitutions).toHaveBeenCalledTimes(1);
  expect(result.institutions).toEqual(catalog);
  now += 5 * 60 * 1000;
  await show(false);
  await show(true);
  expect(fetchFinancialInstitutions).toHaveBeenCalledTimes(2);
});

test('trocar de perfil limpa dados mesmo com o seletor fechado', async () => {
  await show(true);
  await show(false);
  useOnboarding.mockReturnValue({ session: { accessToken: 'profile-b' } });
  await show(false);
  expect(result.institutions).toEqual([]);
  const next = [{ id: 97, name: 'Unicred' }];
  fetchFinancialInstitutions.mockResolvedValue(next);
  await show(true);
  expect(result.institutions).toEqual(next);
  expect(fetchFinancialInstitutions).toHaveBeenLastCalledWith('/api/institutions', expect.objectContaining({ accessToken: 'profile-b' }));
});

test('retry ignora o cache e respostas vazias válidas podem ser reutilizadas', async () => {
  await show(true);
  fetchFinancialInstitutions.mockResolvedValue([]);
  await act(async () => result.retry());
  expect(result.institutions).toEqual([]);
  await show(false);
  await show(true);
  expect(fetchFinancialInstitutions).toHaveBeenCalledTimes(2);
});

test('falhas não ficam em cache', async () => {
  fetchFinancialInstitutions.mockRejectedValueOnce(new TypeError('offline'));
  await show(true);
  expect(result.error).toContain('conectar');
  await show(false);
  await show(true);
  expect(fetchFinancialInstitutions).toHaveBeenCalledTimes(2);
  expect(result.error).toBe('');
});

test('fechar antes da resposta cancela a consulta e não grava resultado atrasado', async () => {
  let resolve;
  fetchFinancialInstitutions.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await show(true);
  const signal = fetchFinancialInstitutions.mock.calls[0][1].signal;
  await show(false);
  expect(signal.aborted).toBe(true);
  await act(async () => resolve([{ id: 1, name: 'Resposta atrasada' }]));
  await show(true);
  expect(fetchFinancialInstitutions).toHaveBeenCalledTimes(2);
  expect(result.institutions).toEqual(catalog);
});
