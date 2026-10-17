import { normalizeAssistantPresentation } from '../utils/assistantPresentation';
import { authenticatedFetch } from './apiClient';
import { assistantEndpoint, assistantLimits } from '../config/assistant';

const errors = {
  ASSISTANT_ANSWER_CONTEXT_LIMIT: 'O resultado ficou amplo demais para responder. Tente uma pergunta mais específica.',
  ASSISTANT_ANSWER_INVALID: 'A consulta foi salva, mas a resposta não pôde ser validada. Tente enviar novamente.',
  ASSISTANT_ANSWER_UNAVAILABLE: 'A consulta foi salva, mas o Gemini não conseguiu responder agora. Tente enviar novamente.',
  ASSISTANT_QUERY_COST_LIMIT: 'A consulta ficou ampla demais. Tente limitar o período ou os filtros.',
  ASSISTANT_QUERY_TIME_LIMIT: 'A consulta ultrapassou o tempo permitido. Tente um período menor.',
  ASSISTANT_QUERY_RESULT_LIMIT: 'O resultado ficou grande demais. Tente uma pergunta mais específica.',
  ASSISTANT_QUERY_READER_UNAVAILABLE: 'Não foi possível consultar seus dados agora. Tente novamente.',
  ASSISTANT_QUERY_ISOLATION_GUARD: 'A consulta está indisponível no momento. Tente novamente mais tarde.',
  ASSISTANT_QUERY_QUERY_FAILED: 'Não foi possível concluir esta consulta. Tente reformular sua pergunta.',

  ASSISTANT_SQL_REJECTED: 'Não foi possível preparar uma consulta dentro das regras de segurança. Tente reformular ou enviar novamente.',
  ASSISTANT_PLANNING_UNAVAILABLE: 'Sua pergunta foi salva, mas o Gemini está indisponível. Tente enviar novamente.',
  ASSISTANT_PLANNING_IN_PROGRESS: 'Sua pergunta ainda está sendo preparada. Aguarde e tente novamente.',
  ASSISTANT_MESSAGE_KEY_MISMATCH: 'A identificação do envio mudou. Tente novamente.',
  ASSISTANT_CONVERSATION_NOT_FOUND: 'Conversa não encontrada na API. Inicie uma nova conversa.',
  ASSISTANT_CONVERSATION_CONFLICT: 'A identificação da conversa mudou. Inicie uma nova conversa.',
  ASSISTANT_MESSAGE_CONFLICT: 'Este envio já foi usado para outra pergunta. Envie como uma nova mensagem.',
  ASSISTANT_CONVERSATION_LIMIT: 'Esta conversa atingiu o limite de mensagens. Inicie uma nova conversa.',
  ASSISTANT_HISTORY_LIMIT: 'Você atingiu o limite de 50 conversas salvas na API.',
};

export async function sendAssistantMessage({ conversation, message, accessToken, signal }) {
  if (!assistantEndpoint) throw new Error('O assistente está sendo preparado. Tente novamente quando ele estiver disponível.');
  if (!/^\/api\/[a-zA-Z0-9/_-]+$/.test(assistantEndpoint)) throw new Error('A conexão do assistente ainda não está configurada.');
  if (message.attachments?.length) throw new Error('O envio de anexos ainda não está disponível nesta etapa. Envie uma pergunta em texto.');
  const content = message.content.trim();
  if (!content || content.length > assistantLimits.textLength) throw new Error('Digite uma pergunta com até 6.000 caracteres.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 90000);
  try {
    if (controller.signal.aborted) throw new Error('Envio cancelado.');
    const response = await authenticatedFetch(assistantEndpoint, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Idempotency-Key': message.id },
      body: JSON.stringify({
        conversationId: conversation.remoteId || null,
        clientConversationId: conversation.id,
        clientMessageId: message.id,
        content,
      }), signal: controller.signal,
    }, accessToken);
    if (!response.ok) {
      if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente.');
      const result = await response.json().catch(() => null);
      throw new Error(errors[result?.code] || (response.status === 429
        ? 'Muitas perguntas em pouco tempo. Aguarde e tente novamente.'
        : 'Não foi possível receber sua pergunta agora. Tente novamente.'));
    }
    const result = await response.json();
    if (result?.status === 'received') {
      if (typeof result.conversationId !== 'string' || !result.conversationId ||
        result.message?.clientMessageId !== message.id || result.message?.role !== 'user' ||
        result.message?.status !== 'received' || typeof result.message.id !== 'string' ||
        typeof result.message.receivedAt !== 'string' || !Number.isFinite(Date.parse(result.message.receivedAt)))
        throw new Error('O assistente retornou uma confirmação inválida. Tente novamente.');
      return { delivery: 'received', remoteId: result.conversationId, serverMessageId: result.message.id,
        receivedAt: result.message.receivedAt };
    }
    if (['planned', 'queried', 'answered', 'clarification', 'unsupported'].includes(result?.status)) {
      const receipt = result.message;
      const reply = result.reply;
      if (typeof result.conversationId !== 'string' || !result.conversationId ||
        receipt?.clientMessageId !== message.id || receipt?.role !== 'user' || receipt?.status !== result.status ||
        typeof receipt.id !== 'string' || !receipt.id || !Number.isFinite(Date.parse(receipt.receivedAt)) ||
        reply?.role !== 'assistant' || typeof reply.id !== 'string' || !reply.id ||
        typeof reply.content !== 'string' || !reply.content.trim() || reply.content.length > assistantLimits.textLength ||
        !Number.isFinite(Date.parse(reply.createdAt)))
        throw new Error('O assistente retornou uma resposta inválida. Tente novamente.');
      return { delivery: result.status, remoteId: result.conversationId, serverMessageId: receipt.id,
        receivedAt: receipt.receivedAt, ...(normalizeAssistantPresentation(reply.presentation) ? { presentation:normalizeAssistantPresentation(reply.presentation) } : {}), content: reply.content, replyId: reply.id, replyCreatedAt: reply.createdAt };
    }
    throw new Error('O assistente retornou uma resposta inválida. Tente novamente.');
  } catch (error) {
    if (signal?.aborted) throw new Error('Envio cancelado.');
    if (controller.signal.aborted) throw new Error('O assistente demorou para receber a pergunta. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar ao assistente. Confira sua conexão.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
