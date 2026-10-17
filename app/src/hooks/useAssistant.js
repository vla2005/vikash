import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantLimits } from '../config/assistant';
import { conversationTitle, newAssistantId } from '../utils/assistant';
import { readAssistantHistory, saveAssistantHistory, importAssistantAttachment, removeAssistantAttachment } from '../services/assistantStorage';
import { pickAssistantAttachments } from '../services/assistantAttachments';
import { sendAssistantMessage } from '../services/assistantApi';

export default function useAssistant({ visible, profileId, accessToken }) {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [revealingReplyId, setRevealingReplyId] = useState(null);
  const finishReplyReveal = useCallback(id => setRevealingReplyId(current => current === id ? null : current), []);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const records = useRef([]);
  const draftFiles = useRef([]);
  const initialized = useRef(false);
  const mounted = useRef(true);
  const request = useRef(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const pickingRef = useRef(false);
  const storageAvailable = useRef(true);
  const queue = useRef(Promise.resolve());
  const persist = useCallback(next => {
    records.current = next;
    if (mounted.current) setConversations(next);
    if (!storageAvailable.current || !profileId) return Promise.resolve(true);
    const task = queue.current.catch(() => {}).then(() => saveAssistantHistory(profileId, next));
    queue.current = task;
    return task.then(() => true).catch(() => {
      if (mounted.current) setStorageError('Não foi possível salvar no aparelho. Esta conversa está disponível apenas nesta sessão.');
      return false;
    });
  }, [profileId]);
  const updateFiles = useCallback(files => { draftFiles.current = files; setAttachments(files); }, []);
  const interrupt = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    busy.current = false;
    if (mounted.current) { setSending(false); setRevealingReplyId(null); }
    const pending = records.current.some(c => c.messages.some(m => m.status === 'sending'));
    if (pending) persist(records.current.map(c => ({ ...c, messages: c.messages.map(m =>
      m.status === 'sending' ? { ...m, status: 'failed', error: 'Envio interrompido. Tente novamente.' } : m) })));
  }, [persist]);
  useEffect(() => {
    if (!visible) { interrupt(); return; }
    if (initialized.current || !profileId) return;
    initialized.current = true;
    setLoading(true);

    readAssistantHistory(profileId).then(saved => {
      if (!mounted.current) return;
      records.current = saved;
      setConversations(saved);
    }).catch(() => {
      storageAvailable.current = false;
      if (mounted.current) setStorageError('Não foi possível abrir o histórico salvo. Novas conversas ficarão apenas nesta sessão até você reabrir o app.');
    }).finally(() => { if (mounted.current) setLoading(false); });

  }, [visible, profileId, interrupt]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      interrupt();
      draftFiles.current.forEach(file => { removeAssistantAttachment(profileId, file).catch(() => {}); });
    };
  }, [interrupt, profileId]);

  const pick = useCallback(async kind => {
    if (pickingRef.current || busy.current || loading) return;
    if (!profileId) { setError('Entre novamente para anexar arquivos ao seu perfil.'); return; }
    pickingRef.current = true;
    setPicking(true); setError('');
    const epoch = generation.current;
    try {
      const assets = await pickAssistantAttachments(kind);
      if (!mounted.current || epoch !== generation.current) return;
      const next = [...draftFiles.current];
      for (const asset of assets) {
        const file = await importAssistantAttachment(profileId, asset, next);
        if (!mounted.current || epoch !== generation.current) {
          await removeAssistantAttachment(profileId, file); break;
        }
        next.push(file);
        updateFiles([...next]);
      }
    } catch (cause) { if (mounted.current && epoch === generation.current) setError(cause.message); }
    finally {
      pickingRef.current = false;
      if (mounted.current) setPicking(false);
    }
  }, [profileId, loading, updateFiles]);
  const removeFile = useCallback(file => {
    updateFiles(draftFiles.current.filter(item => item.id !== file.id));
    removeAssistantAttachment(profileId, file).catch(() => {});
  }, [profileId, updateFiles]);
  const startNew = useCallback(() => {
    interrupt();
    draftFiles.current.forEach(file => { removeAssistantAttachment(profileId, file).catch(() => {}); });
    updateFiles([]); setDraft(''); setError(''); setCurrentId(null);
  }, [interrupt, profileId, updateFiles]);
  const openConversation = useCallback(id => {
    startNew(); setCurrentId(id);
  }, [startNew]);
  const removeConversation = useCallback(async id => {
    if (currentId === id) startNew();
    const removed = records.current.find(c => c.id === id);
    const before = records.current;
    const saved = await persist(before.filter(c => c.id !== id));
    if (!saved) { records.current = before; setConversations(before); throw new Error('Falha ao excluir histórico.'); }
    for (const message of removed?.messages || []) for (const file of message.attachments)
      removeAssistantAttachment(profileId, file).catch(() => {});
  }, [currentId, startNew, persist, profileId]);

  const send = useCallback(async retryId => {
    if (busy.current || pickingRef.current || loading || !profileId) return false;
    const current = records.current.find(c => c.id === currentId);
    const retry = retryId && current?.messages.find(m => m.id === retryId && m.status === 'failed');
    const content = retry ? retry.content : draft.trim();
    if (!retry && !content && !draftFiles.current.length) return false;
    if (!retry && (current?.messages.length || 0) + 2 > assistantLimits.messages) {
      setError('Esta conversa atingiu o limite de 200 mensagens. Inicie uma nova conversa.'); return false;
    }
    if (!current && records.current.length >= assistantLimits.conversations) {
      setError('Você já tem 50 conversas. Exclua uma no histórico para iniciar outra.'); return false;
    }
    busy.current = true; setSending(true); setError('');
    const epoch = ++generation.current;
    const message = retry ? { ...retry, status: 'sending', error: '' } : {
      id: newAssistantId(), role: 'user', content, attachments: draftFiles.current,
      status: 'sending', createdAt: new Date().toISOString(),
    };
    const conversation = { ...(current || { id: newAssistantId(), title: conversationTitle(content), createdAt: message.createdAt }),
      updatedAt: new Date().toISOString(),
      messages: retry ? current.messages.map(m => m.id === retryId ? message : m) : [...(current?.messages || []), message] };
    setCurrentId(conversation.id);
    if (!retry) { setDraft(''); updateFiles([]); }
    await persist([conversation, ...records.current.filter(c => c.id !== conversation.id)]);
    if (epoch !== generation.current || !mounted.current) return true;
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await sendAssistantMessage({ conversation, message, profileId, accessToken, signal: controller.signal });
      if (!mounted.current || epoch !== generation.current) return true;
      const replyId = response.replyId || newAssistantId();
      if (response.delivery !== 'received') setRevealingReplyId(replyId);
      await persist(records.current.map(c => c.id !== conversation.id ? c : ({
        ...c, remoteId: response.remoteId || c.remoteId, updatedAt: new Date().toISOString(),
        messages: [...c.messages.map(m => m.id === message.id ? { ...m, status: 'sent', error: '',
            delivery: response.delivery, serverMessageId: response.serverMessageId, receivedAt: response.receivedAt } : m),
          ...(response.delivery === 'received' ? [] : [{ id: replyId, role: 'assistant', content: response.content,
            attachments: [], ...(response.presentation ? {presentation:response.presentation} : {}), status: 'sent', createdAt: response.replyCreatedAt || new Date().toISOString() }])],
      })));
    } catch (cause) {
      if (!mounted.current || epoch !== generation.current) return true;
      await persist(records.current.map(c => c.id !== conversation.id ? c : ({ ...c,
        messages: c.messages.map(m => m.id === message.id ? { ...m, status: 'failed', error: cause.message } : m) })));
    } finally {
      if (epoch === generation.current) {
        request.current = null; busy.current = false;
        if (mounted.current) setSending(false);
      }
    }
    return true;
  }, [currentId, draft, loading, profileId, accessToken, persist, updateFiles]);

  return { conversations, conversation: conversations.find(c => c.id === currentId), currentId,
    draft, setDraft, attachments, pick, removeFile, loading, picking, sending, error, storageError,
    send, interrupt, startNew, openConversation, removeConversation, revealingReplyId, finishReplyReveal };
}
