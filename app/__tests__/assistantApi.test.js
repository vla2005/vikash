import { sendAssistantMessage } from '../src/services/assistantApi';
import { authenticatedFetch } from '../src/services/apiClient';
let mockEndpoint = '/api/assistant/messages';
jest.mock('../src/config/assistantEndpoint', () => ({ get assistantEndpoint() { return mockEndpoint; } }));
jest.mock('../src/services/apiClient', () => ({ authenticatedFetch: jest.fn() }));
const message = { id: 'msg-2', role: 'user', content: '  E ontem?  ', attachments: [] };
const conversation = { id: 'local', remoteId: 'remote', messages: [
  { id: 'msg-1', role: 'user', content: 'Quanto gastei?', attachments: [] },
  { id: 'reply-1', role: 'assistant', content: 'Histórico local', attachments: [] }, message,
] };
const receipt = () => ({ conversationId: 'server-id', status: 'received', message: {
  id: 'server-message', clientMessageId: message.id, role: 'user', status: 'received', receivedAt: '2026-10-16T12:00:00Z',
} });
beforeEach(() => {
  jest.clearAllMocks();
  mockEndpoint = '/api/assistant/messages';
  authenticatedFetch.mockResolvedValue({ ok: true, status: 201, json: async () => receipt() });
});

test('envia somente a nova pergunta e os IDs pelo cliente autenticado, sem histórico nem usuário declarado', async () => {
  const response = await sendAssistantMessage({ conversation, message, profileId: 'a', accessToken: 'token' });
  expect(response).toEqual({ delivery: 'received', remoteId: 'server-id', serverMessageId: 'server-message', receivedAt: '2026-10-16T12:00:00Z' });
  const [path, options, token] = authenticatedFetch.mock.calls[0];
  expect(path).toBe('/api/assistant/messages');
  expect(token).toBe('token');
  expect(options.headers['Idempotency-Key']).toBe('msg-2');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ conversationId: 'remote', clientConversationId: 'local', clientMessageId: 'msg-2', content: 'E ontem?' });
});

test('primeiro envio não confunde ID local com ID remoto; retry preserva o contrato', async () => {
  const local = { ...conversation, remoteId: undefined };
  await sendAssistantMessage({ conversation: local, message });
  await sendAssistantMessage({ conversation: local, message });
  expect(authenticatedFetch.mock.calls[0][1].body).toBe(authenticatedFetch.mock.calls[1][1].body);
  expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body).conversationId).toBeNull();
});

test('endpoint externo nunca recebe autenticação', async () => {
  mockEndpoint = '';
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('preparado');
  mockEndpoint = 'https://other.example/steal';
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('configurada');
  expect(authenticatedFetch).not.toHaveBeenCalled();
});

test('nesta etapa rejeita anexos, texto vazio e texto excessivo antes da rede', async () => {
  for (const [input, error] of [
    [{ ...message, attachments: [{ id: 'a' }] }, 'anexos'],
    [{ ...message, content: '   ' }, '6.000'],
    [{ ...message, content: 'x'.repeat(6001) }, '6.000'],
  ]) await expect(sendAssistantMessage({ conversation, message: input })).rejects.toThrow(error);
  expect(authenticatedFetch).not.toHaveBeenCalled();
});

test('rejeita recibo de outra mensagem e respostas malformadas', async () => {
  authenticatedFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...receipt(), message: { ...receipt().message, clientMessageId: 'another' } }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('inválida');
  authenticatedFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'wrong-contract' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('inválida');
});

test('erros da API preservam orientação e não expõem detalhes internos', async () => {
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND', message: 'internal detail' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('Inicie uma nova conversa');
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => { throw new Error('HTML error'); } });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('Tente novamente');
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 401 });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('sessão expirou');
});

test('requisição já cancelada nunca é enviada', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(sendAssistantMessage({ conversation, message, signal: controller.signal })).rejects.toThrow('cancelado');
  expect(authenticatedFetch).not.toHaveBeenCalled();
});

test.each(['planned', 'queried', 'answered', 'clarification', 'unsupported'])('recebe %s com recibo correlacionado e resposta oficial, sem expor SQL', async status => {
  const body = { ...receipt(), status, message: { ...receipt().message, status }, reply: {
    id: 'official-reply', role: 'assistant', content: 'Qual período você quer consultar?', createdAt: '2026-10-16T12:01:00Z',
  } };
  authenticatedFetch.mockResolvedValueOnce({ ok: true, json: async () => body });
  await expect(sendAssistantMessage({ conversation, message })).resolves.toEqual({ delivery: status,
    remoteId: 'server-id', serverMessageId: 'server-message', receivedAt: '2026-10-16T12:00:00Z',
    replyId: 'official-reply', replyCreatedAt: '2026-10-16T12:01:00Z', content: body.reply.content });
});

test('rejeita resposta sem recibo correlacionado e mostra falha recuperável do Gemini', async () => {
  authenticatedFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'planned', reply: { content: 'Inválido' } }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('inválida');
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: 'ASSISTANT_PLANNING_UNAVAILABLE' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('pergunta foi salva');
});


test('SQL rejeitado retorna orientação segura sem expor SQL do modelo', async () => {
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ code: 'ASSISTANT_SQL_REJECTED', message: 'secret SQL' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('regras de segurança');
});


test.each([
  ['COST_LIMIT', 'limitar'], ['TIME_LIMIT', 'tempo'], ['RESULT_LIMIT', 'específica'],
  ['READER_UNAVAILABLE', 'consultar'], ['ISOLATION_GUARD', 'indisponível'], ['QUERY_FAILED', 'reformular'],
])('falha de consulta %s mostra orientação segura', async (code, expected) => {
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ code: `ASSISTANT_QUERY_${code}`, message: 'secret SQL and values' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow(expected);
});


test.each(['INVALID', 'UNAVAILABLE', 'CONTEXT_LIMIT'])('falha da resposta %s preserva orientação sem expor dados', async code => {
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: `ASSISTANT_ANSWER_${code}`, message: 'secret SQL and financial rows' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow(code === 'CONTEXT_LIMIT' ? 'específica' : 'consulta foi salva');
});

test('keeps typed visual answer metadata and falls back to text for unknown versions',async()=>{
 const presentation={version:'financial-presentation-v1',queriedAt:'2026-10-16T21:00:00Z',limited:false,
  blocks:[{type:'metric',title:'Saldo em contas',caption:'Consulta atual',value:'R$ 10,00',format:'money',items:[]}]};
 const body={...receipt(),status:'answered',message:{...receipt().message,status:'answered'},reply:{id:'official',role:'assistant',content:'Seu saldo é R$ 10,00.',createdAt:'2026-10-16T21:00:00Z',presentation}};
 authenticatedFetch.mockResolvedValueOnce({ok:true,json:async()=>body});
 expect((await sendAssistantMessage({conversation,message})).presentation).toEqual(presentation);
 body.reply.presentation={...presentation,version:'future'};authenticatedFetch.mockResolvedValueOnce({ok:true,json:async()=>body});
 const fallback=await sendAssistantMessage({conversation,message});expect(fallback.presentation).toBeUndefined();expect(fallback.content).toBe(body.reply.content);
});
