import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';
import AnimatedInputBar from '../../shared/components/reacticx/base/animated-input-bar';
import GlassMaterial from '../silver/GlassMaterial';
import Icon from '../Icon';
import { assistantLimits } from '../../config/assistant';
import { fileSizeLabel } from '../../utils/assistant';
import { fontFamily, fontFamilyMedium } from '../../theme';
const fullComposerHeight = 178;
const placeholders = ['Pergunte sobre suas finanças...', 'Compare seus gastos do mês', 'Tire uma dúvida sobre um comprovante'];
export default function AssistantComposer({ controller, inputRef, onSend, onClose, compact, containerRef, onFocus, onBlur, animatePlaceholder=true }) {
  const [height, setHeight] = useState(48);
  const disabled = controller.sending || controller.picking || controller.loading;
  const canSend = !disabled && (!!controller.draft.trim() || !!controller.attachments.length);
  // Character exits may keep the native input visible after navigation. Skip
  // them only when the whole composer unmounts; placeholder cycling stays animated.
  return <LayoutAnimationConfig skipExiting><View ref={containerRef} collapsable={false} testID="assistant-composer" style={[s.outer, Platform.OS !== 'web' && s.nativeOuter]}>
    {!!controller.error && <Text accessibilityRole="alert" style={s.error}>{controller.error}</Text>}
    <GlassMaterial blurred={false} style={[s.glass, Platform.OS !== 'web' && (compact ? s.nativeCompactGlass : s.nativeGlass)]}>
      {!compact && <View style={s.titleRow}><View style={s.name}><Icon name="sparkles" size={18} color="#E6A64C" /><Text style={s.title}>Pergunte ao ViKash</Text></View>
        <Action icon="close" label="Fechar assistente" onPress={onClose} /></View>}
      <View style={s.inputRow}>
        <AnimatedInputBar ref={inputRef} active animatePlaceholder={animatePlaceholder} placeholders={placeholders} value={controller.draft}
          onChangeText={next => controller.setDraft(next.slice(0, assistantLimits.textLength))}
          editable={!controller.sending && !controller.loading} accessibilityLabel="Mensagem para o ViKash"
          accessibilityHint="Digite sua pergunta. Você também pode anexar imagens e documentos."
          onFocus={onFocus} onBlur={onBlur} multiline maxLength={assistantLimits.textLength} keyboardAppearance="dark"
          selectionColor="#E6A64C" cursorColor="#E6A64C" underlineColorAndroid="transparent" placeholderTextColor="#B0B0B4"
          autoCapitalize="sentences" textAlignVertical="top"
          onContentSizeChange={event => setHeight(Math.max(48, Math.min(120, event.nativeEvent.contentSize.height)))}
          containerStyle={s.inputContainer} inputWrapperStyle={s.inputWrap}
          inputStyle={[s.input, { height }, Platform.OS === 'web' && s.webInput]} placeholderStyle={s.placeholder}
          placeholderContainerStyle={s.placeholderPosition} />
        <Pressable accessibilityRole="button" accessibilityLabel={controller.sending ? 'Parar resposta' : 'Enviar pergunta'}
          accessibilityState={{ disabled: !controller.sending && !canSend, busy: controller.sending }}
          disabled={!controller.sending && !canSend} onPress={controller.sending ? controller.interrupt : onSend}
          style={({ pressed }) => [s.send, !canSend && !controller.sending && s.disabled, pressed && s.pressed]}>
          <Icon name={controller.sending ? 'stop' : 'arrowUp'} color="#141414" size={23} />
        </Pressable>
      </View>
      {!!controller.attachments.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.files}>
        {controller.attachments.map(file => <View style={s.file} key={file.id}>
          <Icon name={file.mimeType.startsWith('image/') ? 'image' : 'statement'} size={18} color="#E6A64C" />
          <View style={s.fileCopy}><Text numberOfLines={1} style={s.fileName}>{file.name}</Text><Text style={s.size}>{fileSizeLabel(file.size)}</Text></View>
          <Action icon="close" label={`Remover anexo ${file.name}`} disabled={disabled} onPress={() => controller.removeFile(file)} />
        </View>)}
      </ScrollView>}
      <View style={s.actions}>
        <Action icon="image" label="Selecionar imagens" disabled={disabled} onPress={() => controller.pick('images')} />
        <Action icon="camera" label="Fotografar" disabled={disabled} onPress={() => controller.pick('camera')} />
        <Action icon="statement" label="Selecionar arquivos" disabled={disabled} onPress={() => controller.pick('files')} />
        <View style={s.limitCopy}>{controller.picking ? <ActivityIndicator size="small" color="#E6A64C" accessibilityLabel="Preparando anexos" /> :
          <Text style={s.limit}>Até 5 anexos · 10 MB cada{compact ? '' : '\n20 MB por mensagem'}</Text>}</View>
      </View>
    </GlassMaterial>
  </View></LayoutAnimationConfig>;
}
export function Action({ icon, label, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => [s.action, disabled && s.disabled, pressed && s.pressed]}><Icon name={icon} size={22} color="#F4F4F3" /></Pressable>;
}
const s = StyleSheet.create({
  outer: { marginHorizontal: 16, marginBottom: 12 },
  nativeOuter: { flexShrink:0 },
  nativeGlass: { minHeight:fullComposerHeight }, nativeCompactGlass: { minHeight:128 },
  glass: { borderRadius: 28, backgroundColor:'rgba(22,22,24,0.90)', borderColor:'rgba(255,255,255,0.22)', borderWidth:1 },
  titleRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingLeft:18, paddingRight:8, paddingTop:6 },
  name: { flexDirection:'row', alignItems:'center', gap:8 }, title: { fontFamily:fontFamilyMedium, color:'#DADADC', fontSize:13 },
  inputRow: { flexDirection:'row', alignItems:'flex-end', paddingHorizontal:16, paddingTop:12, gap:10 },
  inputContainer: { flex:1, width:undefined }, inputWrap: { padding:0, minHeight:48, justifyContent:'flex-start' },
  input: { fontFamily, fontSize:17, lineHeight:25, color:'#FFFFFF', paddingTop:0, paddingBottom:0 },
  webInput: { outlineStyle:'none' },
  placeholder: { fontFamily, fontSize:17, lineHeight:25, color:'#B0B0B4' },
  placeholderPosition: { top:0, left:0, right:0 },
  send: { width:44, height:44, marginBottom:4, borderRadius:22, backgroundColor:'#E6A64C', alignItems:'center', justifyContent:'center' },
  actions: { flexDirection:'row', alignItems:'center', padding:10, gap:4 },
  action: { minWidth:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  limitCopy: { flex:1, alignItems:'flex-end', paddingRight:6 },
  limit: { fontFamily, fontSize:10, lineHeight:15, color:'#B0B0B4', textAlign:'right' },
  disabled: { opacity:0.38 }, pressed: { opacity:0.65 },
  error: { fontFamily, fontSize:13, lineHeight:20, color:'#F79B9F', marginBottom:10, marginHorizontal:6 },
  files: { gap:8, paddingHorizontal:16, paddingTop:12 },
  file: { flexDirection:'row', alignItems:'center', gap:6, borderRadius:14, backgroundColor:'#29292C', paddingLeft:10, maxWidth:230 },
  fileCopy: { flexShrink:1, minWidth:0 }, fileName: { color:'#F4F4F3', fontFamily, fontSize:12 }, size: { color:'#B0B0B4', fontFamily, fontSize:10, marginTop:2 },
});

// Reuse the actual composer/action dimensions for Android's invisible first
// layout, so future spacing changes cannot shift the morph destination.
export const assistantComposerShellStyle = [s.outer,s.nativeOuter,{height:fullComposerHeight}];
export const assistantActionShellStyle = s.action;
