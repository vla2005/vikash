import { postJson } from './apiClient';
import { readValue, writeValue, removeValue } from './secureStorage';
const key = id =>
  `vikash.voice.pending.${Array.from(id)
    .map(c => c.charCodeAt(0).toString(16))
    .join('-')}`;
export async function previewVoiceEntry(text, token, signal) {
  return postJson('/api/transaction/preview', { transcription: text }, token, {
    signal,
  });
}
export async function confirmVoiceEntry(payload, token, signal) {
  return postJson('/api/transaction/confirm-reviewed', payload, token, {
    signal,
  });
}
export async function loadPendingVoiceEntry(id) {
  const value = await readValue(key(id));
  return value ? JSON.parse(value) : null;
}
export const storePendingVoiceEntry = (id, payload) =>
  writeValue(key(id), JSON.stringify(payload));
export const clearPendingVoiceEntry = id => removeValue(key(id));

export async function loadVoiceConsent(id) {
  return (await readValue(`${key(id)}.consent`)) === 'accepted-v2';
}
export const acceptVoiceConsent = id =>
  writeValue(`${key(id)}.consent`, 'accepted-v2');
