import { useEffect, useState } from 'react';
import { fetchCreditCardPurchaseDetails, fetchTransactionDetails } from '../services/transactions';

export default function useTransactionDetails(uuid, accessToken, purchase = false) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setDetails(null); setLoading(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 15000);
    const fetchDetails = purchase ? fetchCreditCardPurchaseDetails : fetchTransactionDetails;
    fetchDetails(uuid, accessToken, controller.signal)
      .then(data => { if (active) { setDetails(data); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError
        ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [uuid, accessToken, purchase, attempt]);
  return { details, loading, error, retry: () => setAttempt(value => value + 1) };
}
