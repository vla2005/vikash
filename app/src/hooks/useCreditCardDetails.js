import { useEffect, useState } from 'react';
import { fetchCreditCardDetails } from '../services/creditCards';

export default function useCreditCardDetails(uuid, accessToken, revision = 0) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(''); setCard(null);
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchCreditCardDetails(uuid, accessToken, controller.signal)
      .then(value => { if (active) { setCard(value); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [uuid, accessToken, revision, attempt]);
  return { card, loading, error, retry: () => setAttempt(value => value + 1) };
}
