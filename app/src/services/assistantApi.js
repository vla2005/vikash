import { authenticatedFetch } from './apiClient';
import { assistantEndpoint, assistantLimits } from '../config/assistant';
import { assistantAttachmentPart } from './assistantStorage';
export async function sendAssistantMessage({ conversation, message, profileId, accessToken, signal }) {
  if (!assistantEndpoint) throw new Error('O assistente está sendo preparado. Você poderá tentar enviar esta pergunta novamente quando ele estiver disponível.');
  if (!/^\/api\/[a-zA-Z0-9/_-]+$/.test(assistantEndpoint)) throw new Error('A conexão do assistente ainda não está configurada.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 60000);
  try {
    const form = new FormData();
    form.append('request', JSON.stringify({
      conversationId: conversation.remoteId || conversation.id,
      clientMessageId: message.id,
      messages: conversation.messages.map(item => ({
        id: item.id, role: item.role, content: item.content,
        attachments: item.attachments.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
      })),
    }));
    // Só os anexos desta pergunta são enviados; os anteriores já pertencem à conversa na API.
    const fileIds = new Set();
    for (const attachment of message.attachments) {
      if (fileIds.has(attachment.id)) continue;
      fileIds.add(attachment.id);
      const part = await assistantAttachmentPart(profileId, attachment);
      form.append(`attachments[${attachment.id}]`, part, ...(typeof Blob !== 'undefined' && part instanceof Blob ? [attachment.name] : []));
    }
    if (controller.signal.aborted) throw new Error('Envio cancelado.');
    const response = await authenticatedFetch(assistantEndpoint, {
      method: 'POST', headers: { Accept: 'application/json', 'Idempotency-Key': message.id },
      body: form, signal: controller.signal,
    }, accessToken);
    if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Não foi possível obter uma resposta agora. Tente novamente.');
    const result = await response.json();
    const content = result?.message?.content;
    if (typeof content !== 'string' || !content.trim() || content.length > assistantLimits.textLength * 10)
      throw new Error('O assistente retornou uma resposta inválida. Tente novamente.');
    return { content, remoteId: typeof result.conversationId === 'string' ? result.conversationId : undefined };
  } catch (error) {
    if (signal?.aborted) throw new Error('Envio cancelado.');
    if (controller.signal.aborted) throw new Error('O assistente demorou para responder. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar ao assistente. Confira sua conexão.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
