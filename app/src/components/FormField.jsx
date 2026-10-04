import React, { forwardRef, useContext, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from './Icon';
import { colors, fontFamily, typography } from '../theme';
import FormFocusContext from '../contexts/FormFocusContext';

const FormField = forwardRef(function FormField({ label, password = false, error, hint, large = false, style, onFocus, onBlur, ...inputProps }, ref) {
  const inputRef = useRef(null);
  const formFocus = useContext(FormFocusContext);
  useImperativeHandle(ref, () => inputRef.current);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={typography.label} nativeID={`${inputProps.testID || label}-label`}>{label}</Text>
      <View style={[styles.inputContainer, focused && styles.focused, error && styles.invalid]}>
        <TextInput ref={inputRef} accessibilityLabel={label} placeholderTextColor="#A0A0A3" selectionColor={colors.primary}
          style={[styles.input, large && styles.large]} secureTextEntry={password && !visible}
          {...inputProps}
          onFocus={event => { setFocused(true); formFocus?.onFocus(inputRef.current); onFocus?.(event); }}
          onBlur={event => { setFocused(false); formFocus?.onBlur(inputRef.current); onBlur?.(event); }} />
        {password && <Pressable onPress={() => setVisible(!visible)} accessibilityRole="button" accessibilityLabel={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} hitSlop={8} style={styles.eye}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={24} />
        </Pressable>}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
});
export default FormField;

const styles = StyleSheet.create({
  field: { gap: 7 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.error },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 15, color: colors.text, fontFamily, fontSize: 17 },
  large: { fontSize: 27, fontWeight: '600', paddingVertical: 16, fontVariant: ['tabular-nums'] },
  eye: { padding: 14 },
  error: { color: colors.error, fontFamily, fontSize: 13, lineHeight: 18 },
  hint: { color: colors.secondary, fontFamily, fontSize: 13, lineHeight: 18 },
});
