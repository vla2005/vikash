import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { useTheme } from '../contexts/ThemeContext';
import { voiceEntryNative } from '../services/voiceEntryNative';
export default function VoiceEntryTileSettings() {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  if (Platform.OS !== 'android') return null;
  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await voiceEntryNative()?.addTile();
      setMessage(
        result === 'added'
          ? 'Atalho disponível na Central de Controle.'
          : 'Abra a Central de Controle, toque em Editar e arraste “Registrar Gasto” para os atalhos ativos. O recurso requer uma nova build do ViKash.',
      );
    } catch {
      setMessage(
        'Abra a Central de Controle e adicione “Registrar Gasto” em Editar.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.section}>
      <PrimaryButton
        title="Adicionar atalho de voz"
        outlined
        icon="mic"
        loading={busy}
        onPress={add}
      />
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.secondary }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ section: { marginTop: 24, gap: 10 } });
