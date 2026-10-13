import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeStyles, useThemeTokens } from '../contexts/ThemeContext';
import { fontFamily, fontFamilyMedium, fontFamilyBold } from '../theme';
import Icon from './Icon';

export default function VoiceAnalysisFeedback({ feedback, onEdit, disabled }) {
  const styles = useThemeStyles(createStyles);
  const { toast } = useThemeTokens();
  const warning = feedback.type === 'warn';
  const color = warning ? toast.warning : toast.error;
  return (
    <View testID="voice-analysis-feedback" style={styles.panel}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion={warning ? 'polite' : 'assertive'}
        accessibilityLabel={
          feedback.title + '. ' + feedback.message +
          (feedback.details?.length ? ' ' + feedback.details.map(detail => detail.label + ': ' + (detail.message || 'Informe esse dado.')).join(' ') : '') +
          (warning ? '' : ' Sua transcrição foi preservada.')
        }
        style={styles.row}
      >
        <View accessible={false} style={[
          styles.status,
          !warning && styles.errorStatus,
          !warning && { borderColor: color },
        ]}>
          <Icon name={warning ? 'warning' : 'close'} size={warning ? 23 : 14} color={color} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{feedback.title}</Text>
          <Text style={styles.message}>{feedback.message}</Text>
          {warning && feedback.details?.map(detail => (
            <View key={detail.field} style={styles.field}>
              <Text style={styles.fieldLabel}>{detail.label}</Text>
              {!!detail.message && <Text style={styles.message}>{detail.message}</Text>}
            </View>
          ))}
          {!warning && <Text style={styles.note}>Sua transcrição foi preservada.</Text>}
        </View>
      </View>
      {warning && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Corrigir transcrição"
          disabled={disabled}
          onPress={onEdit}
          style={({ pressed }) => [styles.edit, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <Icon name="edit" size={17} color={styles.editText.color} />
          <Text style={styles.editText}>Corrigir transcrição</Text>
        </Pressable>
      )}
    </View>
  );
}
const createStyles = colors => StyleSheet.create({
  panel: {
    width: '100%',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.dialogSurface,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  status: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  errorStatus: { borderWidth: 1.5 },
  copy: { flex: 1, gap: 6 },
  title: { fontFamily: fontFamilyBold, fontSize: 14, lineHeight: 21, color: colors.text },
  message: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  field: { gap: 3, marginTop: 8 },
  fieldLabel: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20, color: colors.text },
  note: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary, marginTop: 2 },
  edit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, borderRadius: 14, backgroundColor: colors.surfaceMuted },
  editText: { fontFamily: fontFamilyMedium, fontSize: 13, color: colors.text },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
