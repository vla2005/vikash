import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import useCreditDashboard from '../src/hooks/useCreditDashboard';
import { fetchCreditDashboard, normalizeCreditDashboard } from '../src/services/creditDashboard';
import { credit } from '../testFixtures/dashboard';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/services/creditDashboard', () => ({
  ...jest.requireActual('../src/services/creditDashboard'), fetchCreditDashboard: jest.fn(),
}));
let renderer;
let state;
const props = { year: 2026, month: 10, accessToken: 'access' };
function Probe({ year, month, cardUuid = null, accessToken, revision }) {
  state = useCreditDashboard(year, month, cardUuid, accessToken, revision);
  return null;
}
beforeEach(() => fetchCreditDashboard.mockReset().mockResolvedValue(credit));
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; });

test('credit hook fetches selected month, authenticates and refreshes with revisions', async () => {
  await act(async () => { renderer = TestRenderer.create(<Probe {...props} />); });
  expect(fetchCreditDashboard).toHaveBeenCalledWith(2026, 10, null, 'access', expect.anything());
  expect(state.data.purchasesTotal).toBe(1200);
  await act(async () => renderer.update(<Probe {...props} revision={1} />));
  expect(fetchCreditDashboard).toHaveBeenCalledTimes(2);
});

test('old credit response cannot replace newer period and request is cancelled', async () => {
  let resolveOld;
  fetchCreditDashboard.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  await act(async () => { renderer = TestRenderer.create(<Probe {...props} />); });
  const signal = fetchCreditDashboard.mock.calls[0][4];
  expect(state.loading).toBe(true);
  await act(async () => renderer.update(<Probe {...props} month={11} />));
  expect(signal.aborted).toBe(true);
  await act(async () => resolveOld({ ...credit, purchasesTotal: 9999 }));
  expect(state.data.purchasesTotal).toBe(1200);
});

test('credit failures remove stale data, retry restores results, and missing session sends nothing', async () => {
  fetchCreditDashboard.mockRejectedValueOnce(new TypeError('offline'));
  await act(async () => { renderer = TestRenderer.create(<Probe {...props} />); });
  expect(state.error).toContain('Não foi possível conectar');
  expect(state.data).toBeNull();
  await act(async () => state.retry());
  expect(state.data.purchasesTotal).toBe(1200);
  const calls = fetchCreditDashboard.mock.calls.length;
  await act(async () => renderer.update(<Probe {...props} accessToken={null} />));
  expect(fetchCreditDashboard).toHaveBeenCalledTimes(calls);
  expect(state.data).toBeNull();
});

test('normalizer accepts decimals and rejects malformed history, dates, counts and totals', () => {
  expect(normalizeCreditDashboard({ ...credit, purchasesTotal: '1200.00', invoicesTotal: '320.00' }).purchasesTotal).toBe(1200);
  const malformed = [
    { ...credit, purchasesTotal: null }, { ...credit, monthlyPurchases: [] },
    { ...credit, monthlyPurchases: credit.monthlyPurchases.map(point => ({ ...point, referenceMonth: '2026-13' })) },
    { ...credit, upcomingInvoices: [{ ...credit.upcomingInvoices[0], dueDate: '2026-02-30' }] },
    { ...credit, recentPurchases: [{ ...credit.recentPurchases[0], installmentCount: 0 }] },
    { ...credit, invoicesTotal: -5 }, { ...credit, purchaseCount: 1.5 },
  ];
  malformed.forEach(data => expect(() => normalizeCreditDashboard(data)).toThrow('formato inesperado'));
});
