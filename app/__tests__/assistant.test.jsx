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
