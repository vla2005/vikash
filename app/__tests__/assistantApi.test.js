import { sendAssistantMessage } from '../src/services/assistantApi';
import { authenticatedFetch } from '../src/services/apiClient';
import { assistantAttachmentPart } from '../src/services/assistantStorage';
let mockEndpoint = '/api/assistant/messages';
jest.mock('../src/config/assistantEndpoint', () => ({ get assistantEndpoint() { return mockEndpoint; } }));
jest.mock('../src/services/apiClient', () => ({ authenticatedFetch:jest.fn() }));
jest.mock('../src/services/assistantStorage', () => ({ assistantAttachmentPart:jest.fn() }));
const OriginalForm = global.FormData;
let form;
class TestForm { constructor() { this.parts = []; form = this.parts; } append(...parts) { this.parts.push(parts); } }
const oldFile = { id:'old-file', name:'Anterior.pdf', size:100, mimeType:'application/pdf' };
const newFile = { id:'new-file', name:'Atual.pdf', size:200, mimeType:'application/pdf' };
const message = { id:'msg-2', role:'user', content:'E este?', attachments:[newFile] };
const conversation = { id:'local', remoteId:'remote', messages:[
  { id:'msg-1', role:'user', content:'Veja isto', attachments:[oldFile] },
  { id:'reply-1', role:'assistant', content:'Recebi', attachments:[] }, message,
] };
beforeEach(() => {
  jest.clearAllMocks();
  global.FormData = TestForm;
  mockEndpoint = '/api/assistant/messages';
  assistantAttachmentPart.mockResolvedValue({ uri:'file://private', name:'Atual.pdf', type:'application/pdf' });
  authenticatedFetch.mockResolvedValue({ ok:true, json:async () => ({ conversationId:'server-id', message:{ content:'Resposta válida' } }) });
});
afterEach(() => { global.FormData = OriginalForm; });
test('sends full text context, idempotent message id and only new files through the authenticated client', async () => {
  const response = await sendAssistantMessage({ conversation, message, profileId:'a', accessToken:'token' });
  expect(response).toEqual({ content:'Resposta válida', remoteId:'server-id' });
  const [, options, token] = authenticatedFetch.mock.calls[0];
  expect(token).toBe('token');
  expect(options.headers['Idempotency-Key']).toBe('msg-2');
  expect(options.headers['Content-Type']).toBeUndefined();
  const request = JSON.parse(form[0][1]);
  expect(request.messages).toHaveLength(3);
  expect(request.conversationId).toBe('remote');
  expect(assistantAttachmentPart).toHaveBeenCalledTimes(1);
  expect(assistantAttachmentPart).toHaveBeenCalledWith('a', newFile);
  expect(form[1][0]).toBe('attachments[new-file]');
});
test('unconfigured endpoints never make a request; auth cannot be sent to another origin', async () => {
  mockEndpoint = '';
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('preparado');
  mockEndpoint = 'https://other.example/steal';
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('configurada');
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
test('rejects malformed replies and uses a user-facing error for endpoint failures', async () => {
  authenticatedFetch.mockResolvedValueOnce({ ok:true, json:async () => ({ text:'wrong-contract' }) });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('inválida');
  authenticatedFetch.mockResolvedValueOnce({ ok:false, status:503 });
  await expect(sendAssistantMessage({ conversation, message })).rejects.toThrow('Tente novamente');
});
test('an already cancelled request is never sent', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(sendAssistantMessage({ conversation, message, signal:controller.signal })).rejects.toThrow('cancelado');
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
