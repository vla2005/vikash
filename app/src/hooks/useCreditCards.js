import { useCallback, useEffect, useState } from 'react';
import { fetchCreditCards } from '../services/creditCards';

export default function useCreditCards(accessToken, visible) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!visible || !accessToken) { return; }
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError('');
    fetchCreditCards(accessToken, controller.signal)
      .then(data => { if (active) { setCards(data); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [accessToken, visible, attempt]);
  return { cards, loading, error, retry };
}
