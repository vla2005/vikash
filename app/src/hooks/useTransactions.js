import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTransactions } from '../services/transactions';

export default function useTransactions(accessToken, endpoint = '/api/transaction') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const state = useRef({ page: -1, hasNext: true, busy: false, error: false, generation: 0 });
  const request = useRef(null);
  const load = useCallback(async (retry = false) => {
    const current = state.current;
    if (!accessToken || current.busy || !current.hasNext || (current.error && !retry)) { return; }
    current.busy = true; current.error = false;
    setLoading(true); setError('');
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const result = endpoint === '/api/transaction'
        ? await fetchTransactions(accessToken, current.page + 1, controller.signal)
        : await fetchTransactions(accessToken, current.page + 1, controller.signal, endpoint);
      if (state.current !== current) { return; }
      current.page = result.page; current.hasNext = result.hasNext;
      setHasNext(result.hasNext);
      setRows(previous => {
        const ids = new Set(previous.map(row => row.id));
        return [...previous, ...result.rows.filter(row => { if (ids.has(row.id)) { return false; } ids.add(row.id); return true; })];
      });
    } catch (cause) {
      if (state.current === current) {
        current.error = true;
        setError(cause.name === 'AbortError' || cause instanceof TypeError ? 'Não foi possível conectar à API. Tente novamente.' : cause.message);
      }
    } finally {
      clearTimeout(timeout);
      if (state.current === current) { current.busy = false; setLoading(false); }
    }
  }, [accessToken, endpoint]);
  useEffect(() => {
    state.current = { page: -1, hasNext: true, busy: false, error: false };
    setRows([]); setHasNext(false); setError('');
    if (accessToken && endpoint) { load(); } else { setLoading(false); }
    return () => { state.current = {}; request.current?.abort(); };
  }, [accessToken, endpoint, load]);
  return { rows, loading, error, hasNext, loadMore: () => load(), retry: () => load(true) };
}
