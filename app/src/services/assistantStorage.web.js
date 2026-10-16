/* eslint-env browser */
import { newAssistantId, validateAttachment, validateHistory } from '../utils/assistant';
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vikash-assistant', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir o histórico neste navegador.'));
  });
}
async function transaction(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('data', mode);
      const request = action(tx.objectStore('data'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error('Não foi possível salvar o histórico neste navegador.'));
    });
  } finally { db.close(); }
}
const key = (profileId, id) => JSON.stringify([profileId, id]);
export async function readAssistantHistory(profileId) {
  return validateHistory(await transaction('readonly', store => store.get(key(profileId, 'history'))));
}
export function saveAssistantHistory(profileId, conversations) {
  return transaction('readwrite', store => store.put({ version: 1, conversations }, key(profileId, 'history')));
}
export async function importAssistantAttachment(profileId, asset, existing) {
  const file = asset.file;
  if (!file) throw new Error('Não foi possível ler o arquivo selecionado. Tente novamente.');
  const meta = validateAttachment({ ...asset, size: file.size }, existing);
  const storageKey = `attachment-${newAssistantId()}`;
  await transaction('readwrite', store => store.put(file, key(profileId, storageKey)));
  return { ...meta, storageKey };
}
export async function assistantAttachmentPart(profileId, attachment) {
  const blob = await transaction('readonly', store => store.get(key(profileId, attachment.storageKey)));
  if (!blob) throw new Error(`O anexo “${attachment.name}” não está mais disponível. Anexe-o novamente.`);
  return blob;
}
export function removeAssistantAttachment(profileId, attachment) {
  return transaction('readwrite', store => store.delete(key(profileId, attachment.storageKey)));
}
