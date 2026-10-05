import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { fontFamilyMedium, colors, fontFamily } from '../theme';

export default function TranscriptionDisclosure({ transcription, emptyMessage = 'Não há transcrição disponível.' }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel="Ver transcrição original" accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setExpanded(value => !value)} style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}>
      <View style={styles.icon}><Icon name="microphone" size={21} color={colors.primary} /></View>
      <View style={styles.labels}><Text style={styles.title}>Transcrição original</Text><Text style={styles.caption}>{expanded ? 'O que você disse' : 'Toque para conferir o que você disse'}</Text></View>
      <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}><Icon name="chevronDown" size={18} color={colors.secondary} /></View>
    </Pressable>
    {expanded && <View style={styles.body}><View style={styles.quote}><Text style={styles.text}>{transcription || emptyMessage}</Text></View></View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, minHeight: 82 },
  pressed: { opacity: 0.65 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  labels: { flex: 1, gap: 4 },
  title: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text },
  caption: { fontFamily, fontSize: 12, lineHeight: 18, color: colors.secondary },
  body: { paddingHorizontal: 18, paddingBottom: 20 },
  quote: { borderLeftWidth: 2, borderLeftColor: '#B9CFFF', paddingLeft: 14, paddingVertical: 3 },
  text: { fontFamily, fontSize: 15, lineHeight: 25, color: colors.secondary },
});
