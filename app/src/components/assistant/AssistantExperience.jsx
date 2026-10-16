import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Keyboard, KeyboardAvoidingView, PixelRatio, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AssistantIntelligence from './AssistantIntelligence';
import AssistantEntryLayout from './AssistantEntryLayout';
import { useDock } from '../../contexts/DockContext';
import { assistantOpenGeometry, assistantReturnGeometry, measureAssistantNode } from '../../utils/assistantMotion';
import AssistantMotion from './AssistantMotion';
import AssistantPresentation from './AssistantPresentation';
import AssistantComposer, { Action, assistantComposerShellStyle, assistantActionShellStyle } from './AssistantComposer';
import ConfirmationDialog from '../ConfirmationDialog';
import Icon from '../Icon';
import useAssistant from '../../hooks/useAssistant';
import { assistantEndpoint } from '../../config/assistant';
import { fileSizeLabel } from '../../utils/assistant';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../../theme';

export default function AssistantExperience({ children, visible, onClose, profileId, accessToken, dockOrigin, appFrameRef, onDockCovered, getDockOrigin, startupTrace, captureScope }) {
  const [panelPrepared,setPanelPrepared]=useState(false);
  const [focusSettled,setFocusSettled]=useState(false);
  const [inputFocused,setInputFocused] = useState(false);
  const covered = useRef(false);
  const presentationReady = useRef(false), entryReady = useRef(false);
  const [opening, setOpening] = useState(true);
  const openingPrepared = useRef(false);
  const session = useRef(0);
  const flight = useRef(null);
  const [closing, setClosing] = useState(false);
  const [transition, setTransition] = useState(null);
  const closingRef = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(true);
  const frame = useRef(null);
  const openedFrame = useRef(null);
  const composer = useRef(null);
  const dimensions = useWindowDimensions();
  const dock = useDock();
  const controller = useAssistant({ visible:visible && !closing, profileId, accessToken });
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const input = useRef(null);
  const overlay = useRef(null);
  const list = useRef(null);
  const focusBlocked = useRef(false);
  const touchSequence = useRef(0);
  const status = useRef(null);
  const previousFocus = useRef(null);
  const chat = !!controller.currentId;
  const safeBottom = keyboardVisible ? 8 : Math.max(8, insets.bottom);
  status.current = { visible, history, chat, opening, closing, loading:controller.loading };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    focusBlocked.current = false;
    if (!visible) {
      startupTrace?.flush('closed');setFocusSettled(false);setPanelPrepared(false);
      openedFrame.current=null;presentationReady.current=false;entryReady.current=false;covered.current=false;setInputFocused(false);
      session.current++; openingPrepared.current = false; setOpening(true);
      closingRef.current = false; completed.current = false; setClosing(false); setTransition(null);
      setKeyboardVisible(false); return;
    }
    const show = Keyboard.addListener('keyboardDidShow', () => {startupTrace?.mark('keyboard-shown');setKeyboardVisible(true);});
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    const viewport = Platform.OS === 'web' ? window?.visualViewport : null;
    const baseline = Platform.OS === 'web' ? window?.innerHeight : 0;
    const resize = () => setKeyboardVisible(baseline - viewport.height > 100);
    viewport?.addEventListener('resize',resize);
    return () => { show.remove(); hide.remove(); viewport?.removeEventListener('resize',resize); };
  }, [visible,startupTrace]);
  const focusInput = useCallback(() => {
    if (status.current?.visible && !status.current.history && !status.current.opening && !status.current.closing && !status.current.loading && !focusBlocked.current) input.current?.focus();
  }, []);
  useEffect(() => {
    if (visible && !opening && !closing && !controller.loading) focusInput();
  },[visible,opening,closing,controller.loading,focusInput]);
  const prepareOpen = useCallback(async () => {
    if (openingPrepared.current || closingRef.current || !status.current?.visible || !presentationReady.current || (!status.current.chat && !entryReady.current)) return;
    openingPrepared.current = true;startupTrace?.mark('entry-layout-ready');
    const epoch = session.current;
    const [source, root] = await Promise.all([measureAssistantNode(composer.current),measureAssistantNode(frame.current)]);
    if (!mounted.current || !status.current?.visible || closingRef.current || epoch !== session.current) return;
    startupTrace?.mark('geometry-ready');openedFrame.current=root;
    setTransition(assistantOpenGeometry({source,target:dockOrigin,frame:root,
      width:dimensions.width,height:dimensions.height,bottom:insets.bottom,collapsed:!!dock?.collapsed,compact:chat}));
  },[dockOrigin,dimensions.width,dimensions.height,insets.bottom,dock?.collapsed,chat,startupTrace]);
  const presented = useCallback(() => {presentationReady.current=true;prepareOpen();},[prepareOpen]);
  const entryLaidOut = useCallback(() => {entryReady.current=true;prepareOpen();},[prepareOpen]);
  const coverDock = useCallback(() => {
    if (!mounted.current || !status.current?.visible || closingRef.current || covered.current) return;
    startupTrace?.mark('first-flight-layout');covered.current=true;
    if (Platform.OS === 'android') setPanelPrepared(true);
    onDockCovered?.();
  },[onDockCovered,startupTrace]);
  const finishOpen = useCallback(() => {
    if (!mounted.current || !status.current?.visible || closingRef.current) return;
    startupTrace?.mark('input-revealed');setOpening(false); setTransition(null);
  },[startupTrace]);
  const finishClose = useCallback(() => {
    if (!mounted.current || completed.current || !status.current?.visible) return;
    startupTrace?.flush('closed');completed.current = true; onClose();
  },[onClose,startupTrace]);
  const close = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    focusBlocked.current = true; touchSequence.current++;
    setClosing(true);
    const epoch=session.current;
    const [source, root, currentDock] = await Promise.all([measureAssistantNode(Platform.OS === 'web' && status.current?.opening ? flight.current || composer.current : composer.current),measureAssistantNode(frame.current),Platform.OS !== 'web' ? getDockOrigin?.() : null]);
    if (!mounted.current || !status.current?.visible || epoch !== session.current) return;
    const returnFrame = root && openedFrame.current?.width === root.width ? {...root,height:Math.max(root.height,openedFrame.current.height)} : root;
    const geometry = Platform.OS !== 'web' && status.current?.opening && transition?.direction === 'open' ? {from:transition.to,to:transition.from} : assistantReturnGeometry({source,target:currentDock || dockOrigin,frame:returnFrame,
      width:dimensions.width,height:dimensions.height,bottom:insets.bottom,collapsed:!!dock?.collapsed,compact:chat});
    input.current?.blur(); Keyboard.dismiss(); setTransition(geometry);
  },[dockOrigin,dimensions.width,dimensions.height,insets.bottom,dock?.collapsed,chat,transition,getDockOrigin]);
  const submit = useCallback(() => {
    if (controller.draft.trim() || controller.attachments.length) {
      controller.send();
      Keyboard.dismiss();
    }
  }, [controller]);
  const dismissKeyboard = event => {
    const sequence = ++touchSequence.current;
    // Manual touches take precedence over delayed initial autofocus.
    focusBlocked.current = true;
    const target = event.target;
    const field = input.current;
    if (target && (target === field || (typeof target === 'object' && field?.contains?.(target)))) return false;
    const dismiss = () => {
      if (sequence !== touchSequence.current || !status.current?.visible) return;
      input.current?.blur(); Keyboard.dismiss();
    };
    const { pageX, pageY } = event.nativeEvent || {};
    if (Platform.OS !== 'web' && field?.measureInWindow && Number.isFinite(pageX) && Number.isFinite(pageY)) {
      // Native event targets may be numeric tags, not the TextInput ref. Use
      // window coordinates so touching/positioning the cursor never dismisses it.
      field.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0 && pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) return;
        dismiss();
      });
    } else dismiss();
    // Observe the touch without taking the responder away from child controls.
    return false;
  };
  const back = useCallback(() => {
    if (history) setHistory(false); else close();
  }, [history, close]);
  useEffect(() => {
    if (!visible) { setHistory(false); setDeleteId(null); return; }
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => listener.remove();
  }, [visible, back]);
  const webActions=useRef(null);webActions.current={history,close,submit};
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    previousFocus.current = document.activeElement;
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); if (webActions.current.history) setHistory(false); else webActions.current.close(); }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); webActions.current.submit(); }
      if (event.key === 'Tab') {
        const nodes = [...(overlay.current?.querySelectorAll?.('button,[role="button"],textarea,input,[tabindex="0"]') || [])]
          .filter(node => !node.disabled && node.getBoundingClientRect().height > 0 && node.getAttribute('tabindex') !== '-1');
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || !overlay.current?.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !overlay.current?.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previousFocus.current?.focus?.(); };
  }, [visible]);
  // Start the morph using an exactly sized empty composer. Mount its native
  // input, icons and worklets only after the flight has its first native layout.
  // Drafts/errors/attachments keep their measured full-content path.
  const deferPanel = Platform.OS === 'android' && PixelRatio.getFontScale() <= 1 && opening && !closing && !panelPrepared &&
    !chat && !history && !!profileId && !controller.draft && !controller.attachments.length &&
    !controller.error && !controller.storageError;
  const field = deferPanel ? <View ref={composer} collapsable={false} testID="assistant-composer-shell" style={assistantComposerShellStyle} /> : <AssistantComposer containerRef={composer} controller={controller} inputRef={input} compact={chat}
    animatePlaceholder={Platform.OS !== 'android' || focusSettled}
    onFocus={() => {if (Platform.OS === 'android') setFocusSettled(true);setInputFocused(true);}} onBlur={() => {if (!closingRef.current) setInputFocused(false);}}
    onSend={submit} onClose={close} />;
  const present = backdrop => visible && <AssistantPresentation startupTrace={startupTrace} opening={opening} onOpened={finishOpen} onPresented={presented} onDockCovered={covered.current ? undefined : coverDock} flightRef={flight} closing={closing} transition={transition} onFinished={finishClose} frameRef={frame} backdrop={backdrop} onRequestClose={back}>
    <View ref={overlay} testID="assistant-overlay" accessibilityViewIsModal
      {...(Platform.OS === 'web' ? { role:'dialog', 'aria-modal':true, 'aria-label':history ? 'Histórico de conversas' : 'Pergunte ao ViKash' } : {})}
      style={[StyleSheet.absoluteFill, s.overlay, (chat || history) && s.black]}>
      <AssistantMotion chat={chat || history} style={s.fill}>
        <KeyboardAvoidingView testID="assistant-keyboard-area" style={s.fill}
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          onStartShouldSetResponderCapture={dismissKeyboard}>
        <View testID="assistant-safe-content" style={[s.fill, { paddingTop:insets.top, paddingBottom:safeBottom }]}>
          <View testID="assistant-header" style={s.header}>
            {deferPanel ? <View style={assistantActionShellStyle} /> : <>
            <Action icon={history ? 'back' : 'close'} label={history ? 'Voltar à conversa' : 'Fechar assistente'} onPress={history ? () => setHistory(false) : close} />
            <View style={s.heading}><Icon name="sparkles" color="#E6A64C" size={19} /><Text style={s.headingText}>{history ? 'Histórico' : 'ViKash'}</Text></View>
            <Action icon="edit" label="Nova conversa" onPress={() => { controller.startNew(); setHistory(false); }} />
            <Action icon="history" label="Histórico de conversas" onPress={() => { Keyboard.dismiss(); setHistory(true); }} />
            </>}
          </View>
          {!!controller.storageError && <Text accessibilityRole="alert" style={s.storageError}>{controller.storageError}</Text>}
          {!profileId && <Text accessibilityRole="alert" style={s.storageError}>Entre novamente para salvar suas conversas no seu perfil.</Text>}
          {!chat && !history ? <AssistantEntryLayout deferIntro={deferPanel} focused={Platform.OS === 'web' ? inputFocused && keyboardVisible : inputFocused} opening={opening} closing={closing} loading={controller.loading} onReady={entryLaidOut}
            onDismiss={() => {input.current?.blur();Keyboard.dismiss();}}>{field}</AssistantEntryLayout> :
          controller.loading ? <View style={s.empty}><ActivityIndicator color="#E6A64C" accessibilityLabel="Carregando histórico" /></View> :
          history ? <FlatList data={controller.conversations} keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled" contentContainerStyle={s.historyContent}
            ListEmptyComponent={<View style={s.empty}><Icon name="history" color="#E6A64C" size={32} /><Text style={s.emptyTitle}>Suas conversas ficam aqui</Text><Text style={s.caption}>As perguntas enviadas são salvas neste aparelho.</Text></View>}
            renderItem={({ item }) => <View style={s.historyRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir conversa ${item.title}`}
                onPress={() => { controller.openConversation(item.id); setHistory(false); }} style={s.historyOpen}>
                <Text numberOfLines={2} style={s.historyTitle}>{item.title}</Text>
                <Text style={s.historyDate}>{new Date(item.updatedAt || item.createdAt).toLocaleDateString('pt-BR')} · {item.messages.length} mensagens</Text>
              </Pressable><Action icon="trash" label={`Excluir conversa ${item.title}`} onPress={() => { setDeleteError(''); setDeleteId(item.id); }} />
            </View>} /> :
          chat ? <FlatList ref={list} testID="assistant-messages" data={controller.conversation?.messages || []}
            keyExtractor={item => item.id} contentContainerStyle={s.messages}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated:true })}
            ListFooterComponent={controller.sending ? <View style={s.thinking}><ActivityIndicator size="small" color="#E6A64C" /><Text accessibilityLiveRegion="polite" style={s.caption}>Pensando...</Text></View> : null}
            renderItem={({ item }) => <View testID={`assistant-message-${item.id}`} style={[s.message, item.role === 'user' ? s.userRow : s.assistantRow]}>
              <View style={item.role === 'user' ? s.bubble : s.answer}>
                {!!item.content && <Text selectable style={s.messageText}>{item.content}</Text>}
                {item.attachments.map(file => <View key={file.id} style={s.messageFile}>
                  <Icon name={file.mimeType.startsWith('image/') ? 'image' : 'statement'} color="#E6A64C" size={18} />
                  <View style={s.fileCopy}><Text numberOfLines={2} style={s.fileName}>{file.name}</Text><Text style={s.historyDate}>{fileSizeLabel(file.size)}</Text></View>
                </View>)}
              </View>
              {item.status === 'failed' && <View style={s.feedback}>
                <Text accessibilityRole="alert" style={[s.feedbackText, !assistantEndpoint && s.preparing]}>{item.error || 'Envio interrompido. Tente novamente.'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Tentar enviar pergunta novamente" disabled={controller.sending}
                  onPress={() => controller.send(item.id)} style={s.retry}><Text style={s.retryText}>Tentar novamente</Text></Pressable>
              </View>}
            </View>} /> :
          null}
          {chat && !history && <View collapsable={false}>{field}</View>}
        </View></KeyboardAvoidingView>
      </AssistantMotion>
      <ConfirmationDialog visible={!!deleteId} title="Excluir conversa?" message="Esta conversa e seus anexos serão removidos deste aparelho."
        confirmText="Excluir conversa" variant="danger" loading={deleting} error={deleteError}
        onCancel={() => { if (!deleting) setDeleteId(null); }}
        onConfirm={async () => {
          setDeleting(true);
          try { await controller.removeConversation(deleteId); setDeleteId(null); }
          catch { setDeleteError('Não foi possível excluir agora. Tente novamente.'); }
          finally { setDeleting(false); }
        }} />
    </View></AssistantPresentation>;
  return <View ref={appFrameRef} collapsable={false} testID="assistant-app-frame" style={s.root}>
    <AssistantIntelligence captureScope={captureScope} fallbackVisible={Platform.OS !== 'android' || !opening || !!transition} startupTrace={startupTrace} closing={closing} active={visible && !chat && !history}
      renderOverlay={present}>
      <View style={s.fill} importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={visible} aria-hidden={visible || undefined}
        {...(Platform.OS === 'web' ? { inert:visible ? true : undefined } : {})}>{children}</View>
    </AssistantIntelligence>
  </View>;
}
const s = StyleSheet.create({
  root: { flex:1, width:'100%', maxWidth:460, alignSelf:'center', backgroundColor:'#000000' },
  fill: { flex:1 }, overlay: { zIndex:100, backgroundColor:'rgba(0,0,0,0.26)' }, black: { backgroundColor:'#000000' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingTop:10, paddingBottom:6, gap:4 },
  heading: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7 },
  headingText: { color:'#FFFFFF', fontFamily:fontFamilyMedium, fontSize:15 },
  messages: { paddingHorizontal:20, paddingTop:28, paddingBottom:28, flexGrow:1 },
  message: { marginBottom:26, alignItems:'flex-start' }, userRow: { alignItems:'flex-end' }, assistantRow: { alignItems:'flex-start' },
  bubble: { maxWidth:'88%', borderRadius:24, borderBottomRightRadius:7, backgroundColor:'#242426', paddingHorizontal:18, paddingVertical:13 },
  answer: { width:'100%', paddingVertical:4 }, messageText: { fontFamily, fontSize:16, lineHeight:26, color:'#F4F4F3' },
  messageFile: { flexDirection:'row', alignItems:'center', gap:8, marginTop:10 }, fileCopy: { flex:1, minWidth:0 },
  fileName: { fontFamily, fontSize:12, lineHeight:18, color:'#E5E5E7' },
  feedback: { maxWidth:'88%', marginTop:10, alignItems:'flex-end' }, feedbackText: { fontFamily, fontSize:12, lineHeight:19, color:'#F79B9F' }, preparing: { color:'#DAB67E' },
  retry: { minHeight:44, justifyContent:'center' }, retryText: { color:'#E6A64C', fontFamily:fontFamilyMedium, fontSize:13 },
  thinking: { flexDirection:'row', gap:10, alignItems:'center', paddingVertical:10 }, caption: { color:'#B0B0B4', fontFamily, fontSize:13, lineHeight:20, textAlign:'center' },
  storageError: { marginHorizontal:20, marginVertical:8, color:'#E6A64C', fontFamily, fontSize:12, lineHeight:19 },
  empty: { flex:1, padding:30, gap:16, alignItems:'center', justifyContent:'center' },
  emptyTitle: { color:'#FFFFFF', fontFamily:fontFamilyBold, fontSize:20 },
  historyContent: { flexGrow:1, padding:20 }, historyRow: { flexDirection:'row', alignItems:'center', gap:12, borderBottomWidth:1, borderBottomColor:'#242426', paddingVertical:12 },
  historyOpen: { flex:1, minHeight:56, justifyContent:'center', gap:6 }, historyTitle: { fontFamily:fontFamilyMedium, fontSize:16, lineHeight:23, color:'#F4F4F3' },
  historyDate: { fontFamily, fontSize:11, color:'#B0B0B4', lineHeight:17 },
});
