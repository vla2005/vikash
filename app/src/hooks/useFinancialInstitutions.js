import { useEffect, useState } from 'react';
import { fetchFinancialInstitutions } from '../services/financialInstitutions';
import { useOnboarding } from '../contexts/OnboardingContext';

export default function useFinancialInstitutions(visible) {
  const { session } = useOnboarding();
  const accessToken = session?.accessToken;
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) { return; }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setError('');
    setInstitutions([]);

    fetchFinancialInstitutions('/api/v1/institutions', { signal: controller.signal, accessToken })
      .then(data => { if (active) { setInstitutions(data); } })
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

  return { institutions, loading, error, retry: () => setAttempt(previous => previous + 1) };
}
