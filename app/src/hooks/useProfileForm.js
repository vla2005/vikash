import { useRef, useState } from 'react';
import useToast from './useToast';

// onSave recebe o body validado. A integração futura com a API fica no componente pai.
export default function useProfileForm({ initialValues, validate, toRequest, onSave, onSaved, successMessage, unavailableMessage }) {
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
    if (Object.keys(nextErrors).length) {
      showToast({ type: 'warn', message: 'Confira os campos destacados para continuar.' });
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
      const message = failure.message || 'Não foi possível salvar. Tente novamente.';
      setRequestError(message); setErrors(failure.fieldErrors || {});
      showToast({ type: 'error', message });
    } finally { submitting.current = false; setSaving(false); }
  }

  return { values, errors, requestError, saving, change, submit };
}
