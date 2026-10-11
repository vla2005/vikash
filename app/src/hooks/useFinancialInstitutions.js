import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFinancialInstitutions } from '../services/financialInstitutions';
import { useOnboarding } from '../contexts/OnboardingContext';

const cacheDuration = 5 * 60 * 1000;

export default function useFinancialInstitutions(visible) {
  const { session } = useOnboarding();
  const accessToken = session?.accessToken;
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  // Cache only this picker's catalog, scoped to the current session.
  const cache = useRef(null);
  const retry = useCallback(() => {
    cache.current = null;
    setAttempt(previous => previous + 1);
  }, []);

  useEffect(() => {
    if (cache.current?.accessToken !== accessToken) {
      cache.current = null;
      setInstitutions([]);
    }
    if (!visible) { return; }
    const cached = cache.current;
    if (cached && Date.now() - cached.fetchedAt < cacheDuration) {
      setInstitutions(cached.data);
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    setInstitutions([]);

    fetchFinancialInstitutions('/api/institutions', { signal: controller.signal, accessToken })
      .then(data => {
        if (active) {
          cache.current = { accessToken, data, fetchedAt: Date.now() };
          setInstitutions(data);
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause.name === 'AbortError' || cause instanceof TypeError
            ? 'Não foi possível conectar à API. Confira sua conexão e tente novamente.'
            : cause.message);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) { setLoading(false); }
      });

    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [visible, attempt, accessToken]);

  return { institutions, loading, error, retry };
}
