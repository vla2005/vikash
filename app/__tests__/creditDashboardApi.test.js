import { fetchCreditDashboard } from '../src/services/creditDashboard';
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));

const data = {
  purchasesTotal: '1200.00', purchaseCount: 1, invoicesTotal: '100.00',
  monthlyPurchases: [8, 9, 10, 11, 12, 1].map((month, index) => ({
    referenceMonth: (index === 5 ? '2026' : '2025') + '-' + String(month).padStart(2, '0'),
    total: index === 5 ? '1200.00' : '0.00', purchaseCount: index === 5 ? 1 : 0,
  })),
  expensesPerCategory: [], upcomingInvoices: [], recentPurchases: [],
};
let request;
afterEach(() => request?.mockRestore());

test('credit API sends selected year, month, encoded card, authentication and cancellation signal', async () => {
  const signal = new AbortController().signal;
  request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => data });
  expect(await fetchCreditDashboard(2026, 1, 'card/a', 'token', signal))
    .toMatchObject({ purchasesTotal: 1200, invoicesTotal: 100, purchaseCount: 1 });
  expect(request).toHaveBeenLastCalledWith('http://api.test/api/dashboard/credit?year=2026&month=1&creditCardUuid=card%2Fa',
    expect.objectContaining({ method: 'GET', signal, headers: expect.objectContaining({
      Authorization: 'Bearer token', access_token: 'token',
    }) }));
  await fetchCreditDashboard(2026, 1, null, 'token', signal);
  expect(request.mock.calls[1][0]).toBe('http://api.test/api/dashboard/credit?year=2026&month=1');
});

test('credit API propagates server failures without inventing zero totals', async () => {
  request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 });
  await expect(fetchCreditDashboard(2026, 1, null, 'token')).rejects.toMatchObject({ status: 500 });
});

test('credit API rejects an unexpected response rather than hiding malformed data', async () => {
  request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  await expect(fetchCreditDashboard(2026, 1, null, 'token')).rejects.toThrow('formato inesperado');
});
