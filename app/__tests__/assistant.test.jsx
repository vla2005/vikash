jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets:() => ({ top:0, bottom:0, left:0, right:0 }) }));
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import useAssistant from '../src/hooks/useAssistant';
import AssistantExperience from '../src/components/assistant/AssistantExperience';
import AnimatedInputBar from '../src/shared/components/reacticx/base/animated-input-bar';
import { assistantLimits } from '../src/config/assistant';
import { validateAttachment, validateHistory } from '../src/utils/assistant';
import { readAssistantHistory, saveAssistantHistory, importAssistantAttachment, removeAssistantAttachment } from '../src/services/assistantStorage';
import { pickAssistantAttachments } from '../src/services/assistantAttachments';
import { sendAssistantMessage } from '../src/services/assistantApi';
jest.mock('../src/services/assistantStorage', () => ({
  readAssistantHistory:jest.fn(), saveAssistantHistory:jest.fn(),
  importAssistantAttachment:jest.fn(), removeAssistantAttachment:jest.fn(),
}));
jest.mock('../src/services/assistantAttachments', () => ({ pickAssistantAttachments:jest.fn() }));
jest.mock('../src/services/assistantApi', () => ({ sendAssistantMessage:jest.fn() }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/config/api', () => ({ API_BASE_URL:'http://api.test' }));
let renderer, state;
const props = { visible:true, profileId:'profile-a', accessToken:'token-a' };
function Probe(p) { state = useAssistant(p); return null; }
const mount = async p => act(async () => { renderer = TestRenderer.create(<Probe {...props} {...p} />); });
const ask = async text => {
  await act(async () => state.setDraft(text));
  await act(async () => state.send());
};
beforeEach(() => {
  jest.clearAllMocks();
  readAssistantHistory.mockResolvedValue([]);
  saveAssistantHistory.mockResolvedValue();
  removeAssistantAttachment.mockResolvedValue();
  sendAssistantMessage.mockResolvedValue({ content:'Resposta de teste', remoteId:'remote-1' });
});
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; });

test('only opens storage on demand, saves sent questions and sends full conversation context without duplicate turns', async () => {
  await mount({ visible:false });
  expect(readAssistantHistory).not.toHaveBeenCalled();
  await act(async () => renderer.update(<Probe {...props} />));
  await ask('Quanto gastei?');
  expect(state.conversation.messages.map(m => m.role)).toEqual(['user','assistant']);
  expect(saveAssistantHistory).toHaveBeenLastCalledWith('profile-a', expect.any(Array));
  await ask('E ontem?');
  const sent = sendAssistantMessage.mock.calls[1][0];
  expect(sent.conversation.messages.map(m => m.content)).toEqual(['Quanto gastei?', 'Resposta de teste', 'E ontem?']);
  expect(sent.conversation.remoteId).toBe('remote-1');
  expect(sent.accessToken).toBe('token-a');
});

test('failed questions stay in history, retry uses the same message id and never fabricates an answer', async () => {
  sendAssistantMessage.mockRejectedValueOnce(new Error('API indisponível'));
  await mount(); await ask('Minha pergunta');
  const question = state.conversation.messages[0];
  expect(question.status).toBe('failed');
  expect(state.conversation.messages).toHaveLength(1);
  await act(async () => state.send(question.id));
  expect(state.conversation.messages).toHaveLength(2);
  expect(sendAssistantMessage.mock.calls[1][0].message.id).toBe(question.id);
});

test('closing cancels pending requests, ignores late answers and preserves the question for retry', async () => {
  let finish;
  sendAssistantMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => state.setDraft('Pendente'));
  let pending;
  await act(async () => { pending = state.send(); });
  const signal = sendAssistantMessage.mock.calls[0][0].signal;
  await act(async () => renderer.update(<Probe {...props} visible={false} />));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ content:'Resposta atrasada' }); await pending; });
  expect(state.conversations[0].messages).toHaveLength(1);
  expect(state.conversations[0].messages[0].status).toBe('failed');
});

test('reopens history, starts new threads and deletes a conversation plus its attachments', async () => {
  const attachment = { id:'file', name:'Nota.pdf', mimeType:'application/pdf', size:100, storageKey:'attachment-1' };
  readAssistantHistory.mockResolvedValue([{ id:'saved', title:'Conversa salva', messages:[
    { id:'one', role:'user', content:'Olá', attachments:[attachment], status:'sent' },
  ] }]);
  await mount();
  await act(async () => state.openConversation('saved'));
  expect(state.conversation.id).toBe('saved');
  await act(async () => state.removeConversation('saved'));
  expect(state.conversations).toEqual([]);
  expect(removeAssistantAttachment).toHaveBeenCalledWith('profile-a', attachment);
});

test('storage failure is visible and cannot destroy files of an unsuccessfully deleted history', async () => {
  const file = { id:'file', storageKey:'attachment-1' };
  readAssistantHistory.mockResolvedValue([{ id:'saved', title:'Salva', messages:[{ id:'m', role:'user', content:'Oi', attachments:[file] }] }]);
  await mount();
  saveAssistantHistory.mockRejectedValue(new Error('sem espaço'));
  await act(async () => { await expect(state.removeConversation('saved')).rejects.toThrow(); });
  expect(state.conversations).toHaveLength(1);
  expect(removeAssistantAttachment).not.toHaveBeenCalled();
  expect(state.storageError).toContain('Não foi possível salvar');
});

test('picker cancellation is harmless and late picker results are ignored after closing', async () => {
  let finish;
  pickAssistantAttachments.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  let pending;
  await act(async () => { pending = state.pick('images'); });
  await act(async () => renderer.update(<Probe {...props} visible={false} />));
  await act(async () => { finish([{ uri:'file://picked' }]); await pending; });
  expect(importAssistantAttachment).not.toHaveBeenCalled();
  expect(state.attachments).toEqual([]);
});

test('validates MIME, file size, total size and count before accepting attachments', () => {
  const pdf = { name:'Nota.pdf', size:100, mimeType:'application/pdf' };
  expect(validateAttachment(pdf, []).mimeType).toBe('application/pdf');
  expect(() => validateAttachment({ ...pdf, size:assistantLimits.fileBytes + 1 }, [])).toThrow('10 MB');
  expect(() => validateAttachment(pdf, Array(5).fill(pdf))).toThrow('5 arquivos');
  expect(() => validateAttachment({ ...pdf, size:1 }, [{ size:assistantLimits.totalBytes }])).toThrow('20 MB');
  expect(() => validateAttachment({ ...pdf, mimeType:'text/html' }, [])).toThrow('Use uma imagem');
  expect(() => validateAttachment({ ...pdf, size:undefined }, [])).toThrow('verificar o tamanho');
});

test('restored pending messages become retryable and invalid storage is never silently replaced', () => {
  expect(validateHistory({ version:1, conversations:[{ id:'c', title:'Teste', messages:[
    { id:'m', role:'user', content:'Oi', status:'sending' },
  ] }] })[0].messages[0].status).toBe('failed');
  expect(() => validateHistory({ version:99 })).toThrow('não foram substituídos');
});

test('entry reuses the transaction Animated Input Bar and opens a plain black chat after sending', async () => {
  await act(async () => { renderer = TestRenderer.create(<AssistantExperience {...props} onClose={jest.fn()}><React.Fragment /></AssistantExperience>); });
  await act(async () => renderer.root.findByProps({ testID:'assistant-presentation' }).props.onShow());
  expect(renderer.root.findAllByType(AnimatedInputBar)).toHaveLength(1);
  const input = () => renderer.root.findByType(AnimatedInputBar);
  await act(async () => input().props.onChangeText('Quero entender meus gastos'));
  const send = renderer.root.findAll(node => node.props.accessibilityLabel === 'Enviar pergunta' && node.props.onPress)[0];
  await act(async () => send.props.onPress());
  expect(renderer.root.findAllByProps({ testID:'assistant-messages' }).length).toBeGreaterThan(0);
});


test('confirmação de recebimento salva a pergunta sem fabricar uma resposta de IA', async () => {
  sendAssistantMessage.mockResolvedValue({ delivery: 'received', remoteId: 'remote-1', serverMessageId: 'server-1', receivedAt: '2026-10-16T12:00:00Z' });
  await mount();
  await ask('Quanto gastei no mercado?');
  expect(state.conversation.remoteId).toBe('remote-1');
  expect(state.conversation.messages).toHaveLength(1);
  expect(state.conversation.messages[0]).toMatchObject({ role: 'user', status: 'sent', delivery: 'received', serverMessageId: 'server-1' });
  expect(state.sending).toBe(false);
  await ask('E no mês passado?');
  expect(sendAssistantMessage.mock.calls[1][0].conversation.remoteId).toBe('remote-1');
  expect(state.conversation.messages.map(item => item.role)).toEqual(['user', 'user']);
});

test('chat mostra o recebimento explicitamente sem bolha de resposta ou spinner pendente', async () => {
  sendAssistantMessage.mockResolvedValue({ delivery: 'received', remoteId: 'remote-1', serverMessageId: 'server-1', receivedAt: '2026-10-16T12:00:00Z' });
  await act(async () => { renderer = TestRenderer.create(<AssistantExperience {...props} onClose={jest.fn()} />); });
  await act(async () => renderer.root.findByProps({ testID: 'assistant-presentation' }).props.onShow());
  await act(async () => renderer.root.findByType(AnimatedInputBar).props.onChangeText('Minha pergunta'));
  const send = renderer.root.findAll(node => node.props.accessibilityLabel === 'Enviar pergunta' && node.props.onPress)[0];
  await act(async () => send.props.onPress());
  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain('Pergunta recebida e salva.');
  expect(rendered).not.toContain('Enviando pergunta...');
});


test('salva a resposta oficial com ID e data estáveis após retry do planejamento', async () => {
  sendAssistantMessage.mockRejectedValueOnce(new Error('Gemini indisponível'));
  await mount(); await ask('Quanto gastei nas contas este mês?');
  const id = state.conversation.messages[0].id;
  sendAssistantMessage.mockResolvedValueOnce({ delivery: 'planned', remoteId: 'remote-1', serverMessageId: 'q-1',
    receivedAt: '2026-10-16T12:00:00Z', replyId: 'official-reply', replyCreatedAt: '2026-10-16T12:01:00Z',
    content: 'Proposta preparada, ainda sem consultar os dados.' });
  await act(async () => state.send(id));
  expect(state.conversation.messages).toHaveLength(2);
  expect(state.conversation.messages[0]).toMatchObject({ id, status: 'sent', delivery: 'planned' });
  expect(state.conversation.messages[1]).toMatchObject({ id: 'official-reply', role: 'assistant', createdAt: '2026-10-16T12:01:00Z' });
});


test('exibe resposta financeira oficial e usa os IDs estáveis após falha do redator', async () => {
  sendAssistantMessage.mockRejectedValueOnce(new Error('A consulta foi salva, mas o Gemini não conseguiu responder agora.'));
  await mount(); await ask('Qual o saldo atual?');
  const id = state.conversation.messages[0].id;
  sendAssistantMessage.mockResolvedValueOnce({ delivery: 'answered', remoteId: 'remote-1', serverMessageId: 'q-1',
    receivedAt: '2026-10-16T12:00:00Z', replyId: 'answer-1', replyCreatedAt: '2026-10-16T12:01:00Z', content: 'Seu saldo é R$ 1.703,80.' });
  await act(async () => state.send(id));
  expect(state.conversation.messages).toHaveLength(2);
  expect(state.conversation.messages[0]).toMatchObject({ id, status: 'sent', delivery: 'answered' });
  expect(state.conversation.messages[1]).toMatchObject({ id: 'answer-1', role: 'assistant', content: 'Seu saldo é R$ 1.703,80.' });
});

test('stores official visual metadata with the assistant message for reopening history',async()=>{
 const presentation={version:'financial-presentation-v1',queriedAt:'2026-10-16T21:00:00Z',limited:false,blocks:[{type:'metric',title:'Saldo',caption:'Consulta atual',value:'R$ 10,00',format:'money',items:[]}]};
 sendAssistantMessage.mockResolvedValueOnce({delivery:'answered',remoteId:'remote-1',content:'Saldo consultado.',presentation,replyId:'rich-reply',replyCreatedAt:'2026-10-16T21:00:00Z'});
 await mount();await ask('Meu saldo');expect(state.conversation.messages[1].presentation).toEqual(presentation);
 expect(saveAssistantHistory.mock.calls.at(-1)[1][0].messages[1].presentation).toEqual(presentation);
});


test('reply reveal is ephemeral, only targets the new reply and cannot be cleared by an older completion', async () => {
  sendAssistantMessage.mockResolvedValueOnce({delivery:'answered',content:'Resposta completa: R$ 200,00.',replyId:'first'});
  await mount();await ask('Meu consumo');
  expect(state.revealingReplyId).toBe('first');
  expect(saveAssistantHistory.mock.calls.at(-1)[1][0].messages.at(-1).content).toBe('Resposta completa: R$ 200,00.');
  expect(JSON.stringify(saveAssistantHistory.mock.calls.at(-1)[1])).not.toContain('revealingReplyId');
  sendAssistantMessage.mockResolvedValueOnce({delivery:'answered',content:'Outra resposta completa.',replyId:'second'});
  await ask('E no mês passado?');
  await act(async()=>state.finishReplyReveal('first'));expect(state.revealingReplyId).toBe('second');
  await act(async()=>state.finishReplyReveal('second'));expect(state.revealingReplyId).toBeNull();
  const conversation=state.currentId;
  await act(async()=>state.openConversation(conversation));expect(state.revealingReplyId).toBeNull();
});


test('pending network reply shows the message skeleton and failure removes it while preserving retry', async () => {
  let reject;
  sendAssistantMessage.mockImplementationOnce(()=>new Promise((resolve,rejectPromise)=>{reject=rejectPromise;}));
  await act(async()=>{renderer=TestRenderer.create(<AssistantExperience {...props} onClose={jest.fn()}/>);});
  await act(async()=>renderer.root.findByProps({testID:'assistant-presentation'}).props.onShow());
  await act(async()=>renderer.root.findByType(AnimatedInputBar).props.onChangeText('Meu consumo no mês'));
  const button=renderer.root.findAll(node=>node.props.accessibilityLabel==='Enviar pergunta' && node.props.onPress)[0];
  let sending;
  await act(async()=>{sending=button.props.onPress();});
  expect(renderer.root.findAllByProps({testID:'assistant-thinking-skeleton'}).length).toBeGreaterThan(0);
  await act(async()=>{reject(new Error('Não foi possível receber a resposta.'));await sending;});
  expect(renderer.root.findAllByProps({testID:'assistant-thinking-skeleton'})).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('Meu consumo no mês');
  expect(renderer.root.findAll(node=>node.props.accessibilityLabel==='Tentar enviar pergunta novamente').length).toBeGreaterThan(0);
});
