import { useCallback, useEffect, useState } from 'react';
import { fetchCreditDashboard } from '../services/creditDashboard';

export default function useCreditDashboard(year, month, cardUuid, accessToken, revision = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    setState({ data: null, loading: true, error: '' });
    if (!accessToken) {
      setState({ data: null, loading: false, error: 'Entre na sua conta para acompanhar o crédito.' });
      clearTimeout(timer);
      return () => controller.abort();
    }
    fetchCreditDashboard(year, month, cardUuid, accessToken, controller.signal)
      .then(data => { if (active) { setState({ data, loading: false, error: '' }); } })
      .catch(cause => {
        if (active) { setState({ data: null, loading: false, error: cause.name === 'AbortError' || cause instanceof TypeError
          ? 'Não foi possível conectar à API. Tente novamente.' : cause.message }); }
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [year, month, cardUuid, accessToken, revision, attempt]);
  return { ...state, retry };
}
