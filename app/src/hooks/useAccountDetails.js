import { useEffect, useState } from 'react';
import { fetchAccountDetails } from '../services/accounts';

export default function useAccountDetails(uuid, accessToken, revision = 0) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setAccount(null); setLoading(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchAccountDetails(uuid, accessToken, controller.signal)
      .then(value => { if (active) { setAccount(value); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [uuid, accessToken, revision, attempt]);
  return { account, loading, error, retry: () => setAttempt(value => value + 1) };
}
