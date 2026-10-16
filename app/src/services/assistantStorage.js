import { Directory, File, Paths } from 'expo-file-system';
import { newAssistantId, validateAttachment, validateHistory } from '../utils/assistant';
const bucket = profileId => new Directory(Paths.document, 'assistant', encodeURIComponent(profileId));
export async function readAssistantHistory(profileId) {
  const file = new File(bucket(profileId), 'history.json');
  if (!file.exists) return [];
  return validateHistory(JSON.parse(await file.text()));
}
export async function saveAssistantHistory(profileId, conversations) {
  const folder = bucket(profileId);
  folder.create({ intermediates: true, idempotent: true });
  new File(folder, 'history.json').write(JSON.stringify({ version: 1, conversations }));
}
export async function importAssistantAttachment(profileId, asset, existing) {
  const source = new File(asset.uri);
  const meta = validateAttachment({ ...asset, size: source.size }, existing);
  const folder = bucket(profileId);
  folder.create({ intermediates: true, idempotent: true });
  const storageKey = `attachment-${newAssistantId()}`;
  const target = new File(folder, storageKey);
  source.copy(target);
  return { ...meta, storageKey };
}
export async function assistantAttachmentPart(profileId, attachment) {
  if (!/^attachment-[a-z0-9-]+$/.test(attachment.storageKey)) throw new Error('Anexo inválido.');
  const file = new File(bucket(profileId), attachment.storageKey);
  if (!file.exists) throw new Error(`O anexo “${attachment.name}” não está mais disponível. Anexe-o novamente.`);
  return { uri: file.uri, type: attachment.mimeType, name: attachment.name };
}
export async function removeAssistantAttachment(profileId, attachment) {
  if (!/^attachment-[a-z0-9-]+$/.test(attachment.storageKey)) return;
  const file = new File(bucket(profileId), attachment.storageKey);
  if (file.exists) file.delete();
}
