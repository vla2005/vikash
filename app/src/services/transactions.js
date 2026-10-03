import { postJson } from './apiClient';

export async function createTransaction(transcription, accessToken) {
  if (!accessToken) { throw new Error('Entre na sua conta antes de registrar uma transação.'); }
  if (typeof transcription !== 'string' || !transcription.trim()) {
    throw new Error('Revise a transcrição antes de enviar.');
  }
  return postJson('/api/transaction/create', {
    transcription: transcription.trim(),
  }, accessToken, { headers: { access_token: accessToken } });
}
