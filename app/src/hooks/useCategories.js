import { useEffect, useRef, useState } from 'react';
import { createCategory, fetchCategories, updateCategory } from '../services/categories';

export default function useCategories(accessToken, visible) {
  const [categories, setCategories] = useState([]);
  const [defaultCategories, setDefaultCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    setCategories([]); setDefaultCategories([]);
    if (!visible || !accessToken) { return; }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError('');
    fetchCategories(accessToken, controller.signal)
      .then(data => { if (active) { setCategories(data.customCategories); setDefaultCategories(data.defaultCategories); } })
      .catch(cause => { if (active) { setError(cause.name === 'AbortError' || cause instanceof TypeError ? 'Não foi possível conectar à API. Tente novamente.' : cause.message); } })
      .finally(() => { clearTimeout(timeout); if (active) { setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [accessToken, visible, attempt]);
  async function saveCategory(values, editing) {
    if (submitting.current) { return; }
    submitting.current = true;
    setSaving(true);
    try {
      if (editing) { await updateCategory(editing.uuid, values, accessToken); }
      else { await createCategory(values, accessToken); }
      setAttempt(previous => previous + 1);
      return true;
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return { categories, defaultCategories, loading, error, retry: () => setAttempt(previous => previous + 1), saving, saveCategory };
}
