import { assistantLimits, assistantTypes } from '../config/assistant';
let sequence = 0;
export const newAssistantId = () =>
  `v${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const fileSizeLabel = bytes => bytes >= 1048576
  ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`
  : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
const extensions = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf',
  txt: 'text/plain', csv: 'text/csv',
  xlsx: assistantTypes[8], docx: assistantTypes[9] };
export function attachmentType(asset) {
  const ext = (asset.name || asset.fileName || '').split('.').pop()?.toLowerCase();
  return asset.mimeType || extensions[ext] || '';
}
export function validateAttachment(asset, existing) {
  const name = (asset.name || asset.fileName || 'Anexo').split(/[\\/]/).pop().slice(0, 180);
  const mimeType = attachmentType(asset);
  const size = asset.size ?? asset.fileSize ?? asset.file?.size;
  if (!assistantTypes.includes(mimeType)) throw new Error('Use uma imagem, PDF, TXT, CSV, XLSX ou DOCX.');
  if (!Number.isFinite(size) || size <= 0) throw new Error(`Não foi possível verificar o tamanho de “${name}”. Escolha outro arquivo.`);
  if (size > assistantLimits.fileBytes) throw new Error(`“${name}” ultrapassa o limite de 10 MB por arquivo.`);
  if (existing.length >= assistantLimits.attachments) throw new Error('Você pode anexar até 5 arquivos por mensagem.');
  if (existing.reduce((sum, item) => sum + item.size, 0) + size > assistantLimits.totalBytes)
    throw new Error('Os anexos desta mensagem devem somar até 20 MB.');
  return { id: newAssistantId(), name, mimeType, size };
}
export const conversationTitle = text => text.trim().replace(/\s+/g, ' ').slice(0, 64) || 'Conversa com anexos';
export function validateHistory(data) {
  if (!data) return [];
  if (data.version !== 1 || !Array.isArray(data.conversations)) throw new Error('Histórico indisponível. Seus dados não foram substituídos.');
  return data.conversations.filter(c => c && typeof c.id === 'string' && typeof c.title === 'string'
    && Array.isArray(c.messages)).map(c => ({ ...c, messages: c.messages.filter(m =>
      m && typeof m.id === 'string' && ['user', 'assistant'].includes(m.role)
      && typeof m.content === 'string').map(m => ({ ...m,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        status: m.status === 'sending' ? 'failed' : m.status,
      })) }));
}
