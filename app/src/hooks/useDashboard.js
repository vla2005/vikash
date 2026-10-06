import { useCallback, useEffect, useState } from 'react';
import { fetchDashboard } from '../services/dashboard';

export default function useDashboard(year, month, accessToken, revision = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!accessToken) { return; }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError(''); setData(null);
    fetchDashboard(year, month, accessToken, controller.signal)
      .then(result => { if (active) { setData(result); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError
        ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [year, month, accessToken, revision, attempt]);
  return { data, loading, error, retry };
}
