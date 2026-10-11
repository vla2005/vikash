import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  appearanceOptions,
  useTheme,
  useThemeStyles,
} from '../contexts/ThemeContext';
import Icon from './Icon';
import InlineNotice from './InlineNotice';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

export default function AppearanceSettings() {
  const { colors, preference, scheme, setPreference } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function choose(value) {
    if (saving || value === preference) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setPreference(value);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Aparência
      </Text>
      <View style={styles.group}>
        <View style={styles.options}>
          {appearanceOptions.map(option => {
            const selected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Aparência: ${option.label}`}
                accessibilityHint={option.description}
                accessibilityState={{
                  selected,
                  disabled: saving,
                  busy: saving && selected,
                }}
                disabled={saving}
                onPress={() => choose(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.selected,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={option.icon}
                  size={23}
                  color={selected ? colors.primary : colors.secondary}
                />
                <Text style={[styles.label, selected && styles.selectedLabel]}>
                  {option.label}
                </Text>
                <View style={styles.indicator}>
                  {selected && (
                    <Icon name="check" size={14} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.captionRow}>
          <Text style={styles.caption}>
            {preference === 'system'
              ? `Segue o sistema · ${scheme === 'dark' ? 'Escuro' : 'Claro'}`
              : `Modo ${preference === 'dark' ? 'escuro' : 'claro'} ativado`}
          </Text>
          {saving && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              accessibilityLabel="Salvando aparência"
            />
          )}
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
    group: { backgroundColor: colors.surface, borderRadius: 22, padding: 14 },
    options: { flexDirection: 'row', gap: 8 },
    option: {
      flex: 1,
      minHeight: 96,
      paddingVertical: 12,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    label: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      lineHeight: 21,
      color: colors.secondary,
    },
    selectedLabel: { color: colors.primary },
    indicator: { height: 14 },
    captionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 24,
      marginTop: 10,
    },
    caption: {
      flex: 1,
      fontFamily,
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondary,
    },
    pressed: { opacity: 0.72 },
  });
