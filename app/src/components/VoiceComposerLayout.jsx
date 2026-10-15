import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useInputTheme,
  useTheme,
  useThemeStyles,
} from '../contexts/ThemeContext';
import { fontFamily } from '../theme';
import { voiceOrb } from '../theme/silver';
import { pointerEventsStyles } from '../theme/interaction';
import AnimatedInputBar from '../shared/components/reacticx/base/animated-input-bar';
import ComposerGlass from './ComposerGlass';
import Icon from './Icon';
const placeholders = ['Digite seu lançamento...', 'Ex.: R$ 50, Pix no Inter'];
export default function VoiceComposerLayout({
  Box,
  expanded,
  visible,
  sending,
  value,
  inputRef,
  onChangeText,
  onExpand,
  onExpanded,
  onConfirm,
  confirmLabel,
  microphone,
  restartControl,
  cancelControl,
  caption,
  metrics,
  shellStyle,
  controlsStyle,
  microphoneStyle,
  sideControlsStyle,
  stageStyle,
  editorStyle,
  sendStyle,
  voiceCaptionStyle,
  textCaptionStyle,
  shellRef,
}) {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const inputTheme = useInputTheme();
  const inputSize = { height: value ? metrics.textHeight : 24 };
  return (
    <View style={styles.footer}>
      <Box style={[styles.stage, stageStyle]} onLayout={metrics.onLayout}>
        <Box
          testID="voice-microphone-controls"
          style={[
            styles.controls,
            controlsStyle,
            pointerEventsStyles['box-none'],
          ]}
        >
          <View style={[styles.controlsRow, pointerEventsStyles['box-none']]}>
            <Box
              testID="voice-restart-control"
              style={[
                sideControlsStyle,
                pointerEventsStyles[expanded ? 'none' : 'auto'],
              ]}
              accessibilityElementsHidden={expanded}
              aria-hidden={expanded}
              importantForAccessibility={
                expanded ? 'no-hide-descendants' : 'auto'
              }
            >
              {restartControl}
            </Box>
            <Box testID="voice-microphone-motion" style={microphoneStyle}>
              {microphone}
            </Box>
            <Box
              testID="voice-cancel-control"
              style={[
                sideControlsStyle,
                pointerEventsStyles[expanded ? 'none' : 'auto'],
              ]}
              accessibilityElementsHidden={expanded}
              aria-hidden={expanded}
              importantForAccessibility={
                expanded ? 'no-hide-descendants' : 'auto'
              }
            >
              {cancelControl}
            </Box>
          </View>
        </Box>
        <Box
          testID="voice-keyboard-shell"
          ref={shellRef}
          style={[styles.shell, shellStyle]}
        >
          <ComposerGlass>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Editar lançamento' : 'Digitar'}
              accessibilityState={{ expanded, disabled: sending }}
              disabled={sending}
              onPress={expanded ? onExpanded : onExpand}
              style={({ pressed }) => [
                styles.keyboardButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="keyboard" size={22} color={colors.text} />
            </Pressable>
            <Box
              style={[
                styles.editor,
                { width: Math.max(80, metrics.width - 100) },
                editorStyle,
                pointerEventsStyles[expanded ? 'auto' : 'none'],
              ]}
              accessibilityElementsHidden={!expanded}
              aria-hidden={!expanded}
              importantForAccessibility={
                expanded ? 'auto' : 'no-hide-descendants'
              }
            >
              {metrics.opened && (
                <AnimatedInputBar
                  {...inputTheme}
                  ref={inputRef}
                  active={visible && expanded}
                  placeholders={placeholders}
                  value={value}
                  onChangeText={onChangeText}
                  editable={expanded && !sending}
                  accessibilityLabel="Descrição do lançamento"
                  accessibilityHint="Digite os dados e confirme para analisar."
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  onContentSizeChange={metrics.onContentSizeChange}
                  inputWrapperStyle={styles.inputWrapper}
                  placeholderContainerStyle={styles.placeholderContainer}
                  placeholderStyle={styles.placeholder}
                  inputStyle={[styles.input, inputSize]}
                />
              )}
            </Box>
            <Box
              style={[
                styles.send,
                sendStyle,
                pointerEventsStyles[expanded ? 'auto' : 'none'],
              ]}
              accessibilityElementsHidden={!expanded}
              aria-hidden={!expanded}
              importantForAccessibility={
                expanded ? 'auto' : 'no-hide-descendants'
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                accessibilityState={{
                  disabled: sending || !value.trim(),
                  busy: sending,
                }}
                disabled={!expanded || sending || !value.trim()}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.pressed,
                  (sending || !value.trim()) && styles.disabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <View style={styles.up}>
                    <Icon name="arrow" size={20} color={colors.onBrand} />
                  </View>
                )}
              </Pressable>
            </Box>
          </ComposerGlass>
        </Box>
      </Box>
      <View style={styles.captions}>
        <Box
          style={[
            styles.captionLayer,
            voiceCaptionStyle,
            pointerEventsStyles.none,
          ]}
          accessibilityElementsHidden={expanded}
          aria-hidden={expanded}
        >
          <Text style={styles.caption}>{caption}</Text>
        </Box>
        <Box
          style={[
            styles.captionLayer,
            textCaptionStyle,
            pointerEventsStyles.none,
          ]}
          accessibilityElementsHidden={!expanded}
          aria-hidden={!expanded}
        >
          <Text accessibilityLiveRegion="polite" style={styles.caption}>
            {sending ? 'Analisando…' : ''}
          </Text>
        </Box>
      </View>
    </View>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    footer: { flexShrink: 0, paddingTop: 12, paddingBottom: 6 },
    stage: { width: '100%', height: voiceOrb.composer.stageHeight },
    controls: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      gap: 24,
    },
    shell: {
      position: 'absolute',
      top: 84,
      borderRadius: 100,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
    keyboardButton: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    editor: {
      position: 'absolute',
      left: 44,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    send: {
      position: 'absolute',
      right: 4,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    up: { transform: [{ rotate: '-90deg' }] },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.45 },
    inputWrapper: { paddingHorizontal: 8, paddingVertical: 20, minHeight: 64 },
    placeholderContainer: { left: 8, right: 0, top: 20 },
    input: {
      padding: 0,
      minHeight: 24,
      maxHeight: 88,
      fontFamily,
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      ...(Platform.OS === 'web'
        ? { outlineStyle: 'none', outlineWidth: 0 }
        : {}),
    },
    placeholder: {
      color: colors.placeholder,
      fontFamily,
      fontSize: 15,
      lineHeight: 24,
    },
    captions: { position: 'relative', height: 36, marginTop: 4 },
    captionLayer: { ...StyleSheet.absoluteFill },
    caption: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
      textAlign: 'center',
    },
  });
