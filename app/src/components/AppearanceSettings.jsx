import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import Icon from './Icon';
import { lightThemeEnabled } from '../config/appearance';
import InlineNotice from './InlineNotice';
import { fontFamily, fontFamilyBold } from '../theme';

export default function AppearanceSettings() {
  const { colors, scheme, setPreference } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function choose(dark) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await setPreference(dark ? 'dark' : 'light');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  if (!lightThemeEnabled) return null;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Aparência
      </Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Icon
            name={scheme === 'dark' ? 'moon' : 'sun'}
            size={24}
            color={colors.text}
          />
          <View style={styles.copy}>
            <Text style={styles.label}>Tema escuro</Text>
            <Text style={styles.caption}>
              {scheme === 'dark' ? 'Escuro' : 'Claro'}
            </Text>
          </View>
          {saving && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              accessibilityLabel="Salvando aparência"
            />
          )}
          <Switch
            accessibilityLabel="Tema escuro"
            accessibilityHint="Alterna entre os temas claro e escuro"
            accessibilityState={{ busy: saving, disabled: saving }}
            value={scheme === 'dark'}
            disabled={saving}
            onValueChange={choose}
            trackColor={{
              false: colors.toggleTrackOff,
              true: colors.toggleTrackOn,
            }}
            thumbColor={colors.toggleThumb}
            {...(Platform.OS === 'web' && { activeThumbColor: colors.toggleThumb })}
            ios_backgroundColor={colors.toggleTrackOff}
          />
        </View>
        <InlineNotice message={error} error />
      </View>
    </View>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    section: { marginTop: 30 },
    heading: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 21,
      lineHeight: 28,
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: 12,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
    copy: { flex: 1, gap: 3 },
    label: { fontFamily, fontSize: 16, lineHeight: 23, color: colors.text },
    caption: {
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
    },
  });
