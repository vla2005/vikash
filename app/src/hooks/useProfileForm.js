import { useRef, useState } from 'react';
import useToast from './useToast';

// onSave recebe o body validado; a integração com a API fica no componente pai.
export default function useProfileForm({ initialValues, validate, toRequest, onSave, onSaved, successMessage, unavailableMessage, errorMessage, errorFieldMap = {} }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const { showToast } = useToast();

  function change(key, value) {
    setValues(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setRequestError('');
  }

  async function submit() {
    if (submitting.current) { return; }
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length) {
      showToast({ type: errorMessage ? 'error' : 'warn', message: errorMessage || 'Confira os campos destacados para continuar.' });
      return;
    }
    if (!onSave) {
      showToast({ type: 'info', message: unavailableMessage });
      return;
    }
    submitting.current = true;
    setSaving(true); setRequestError('');
    try {
      await onSave(toRequest(values));
      showToast({ type: 'success', message: successMessage });
      onSaved?.();
    } catch (failure) {
      const message = errorMessage || failure.message || 'Não foi possível salvar. Tente novamente.';
      const fieldErrors = Object.fromEntries(Object.entries(failure.fieldErrors || {})
        .map(([key, value]) => [errorFieldMap[key] || key, value])
        .filter(([key, value]) => key in values && typeof value === 'string' && value.trim()));
      setRequestError(Object.keys(fieldErrors).length ? '' : message); setErrors(fieldErrors);
      showToast({ type: 'error', message });
    } finally { submitting.current = false; setSaving(false); }
  }

  return { values, errors, requestError, saving, change, submit };
}
