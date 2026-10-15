// Adaptado do Animated Input Bar do Reacticx: valor controlado, pausa em
// segundo plano e placeholders sem desfoque ou trabalho JS por frame.
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, TextInput, View } from 'react-native';

export function InputBar({
  Character,
  inputRef,
  placeholders,
  active = true,
  animationInterval = 4200,
  value,
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  containerStyle,
  inputWrapperStyle,
  inputStyle,
  placeholderStyle,
  placeholderContainerStyle,
  characterEnterDuration = 260,
  characterExitDuration = 160,
  characterDelayIncrement = 12,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [index, setIndex] = useState(0);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const text = value ?? localValue;
  const rotating = active && foreground && editable && !focused && !text;
  const placeholder =
    placeholders[index % Math.max(placeholders.length, 1)] || '';
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    const visibility = () => setForeground(!document.hidden);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      subscription.remove();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibility);
      }
    };
  }, []);
  useEffect(() => {
    if (!rotating || placeholders.length < 2) {
      return;
    }
    const timer = setTimeout(
      () => setIndex(current => current + 1),
      animationInterval,
    );
    return () => clearTimeout(timer);
  }, [rotating, index, placeholders.length, animationInterval]);
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.inputWrapper, inputWrapperStyle]}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={[
            styles.placeholder,
            placeholderContainerStyle,
            !rotating && styles.hidden,
          ]}
        >
          {rotating &&
            Array.from(placeholder).map((char, characterIndex) => (
              <Character
                key={`${placeholder}-${characterIndex}`}
                char={char}
                index={characterIndex}
                enterDuration={characterEnterDuration}
                exitDuration={characterExitDuration}
                delayIncrement={characterDelayIncrement}
                style={[styles.character, placeholderStyle]}
              />
            ))}
        </View>
        <TextInput
          {...props}
          ref={inputRef}
          editable={editable}
          value={text}
          placeholder={focused ? placeholder : ''}
          style={[styles.input, inputStyle]}
          onChangeText={next => {
            if (value === undefined) {
              setLocalValue(next);
            }
            onChangeText?.(next);
          }}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  inputWrapper: {
    position: 'relative',
    padding: 18,
    minHeight: 56,
    justifyContent: 'center',
  },
  placeholder: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    pointerEvents: 'none',
  },
  hidden: { opacity: 0 },
  character: { fontSize: 16, lineHeight: 24, color: '#71717a' },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    color: '#fafafa',
    minWidth: 0,
  },
});
