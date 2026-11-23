import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDebts, payDebtInstallment } from '../services/debts';
import { notifyFinancialChange } from '../services/financialChanges';

export default function useDebts(accessToken, visible) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    if (!visible || !accessToken) { return undefined; }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    fetchDebts(accessToken, controller.signal)
      .then(data => { if (active) { setDebts(data); } })
      .catch(cause => {
        if (active) {
          setError(cause.name === 'AbortError' || cause instanceof TypeError
            ? 'Não foi possível conectar à API. Tente novamente.' : cause.message);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) { setLoading(false); }
      });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [accessToken, visible, attempt]);

  const pay = useCallback(async (uuid, number, payment) => {
    try {
      await payDebtInstallment(uuid, number, payment, accessToken);
    } catch (cause) {
      if (cause.status === 409) { retry(); }
      throw cause;
    }
    notifyFinancialChange();
  }, [accessToken, retry]);

  return useMemo(() => ({ debts, loading, error, retry, pay }), [debts, loading, error, retry, pay]);
}
