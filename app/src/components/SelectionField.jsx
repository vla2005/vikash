import React, { useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, fontFamily, typography } from '../theme';

export default function SelectionField({ label, value, options, onChange, placeholder = 'Selecione', searchable = false, error, hint, renderLeading, renderOption, numColumns = 1, disabled = false, compact = false }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = options.find(option => option.value === value);
  const isGrid = numColumns > 1;
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = options.filter(option => normalize(option.label).includes(normalize(query.trim())));
  return <View style={styles.field}>
    {!compact && <Text style={typography.label}>{label}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ expanded: visible, disabled }} aria-expanded={visible} onPress={() => { Keyboard.dismiss(); setQuery(''); setVisible(true); }} style={[styles.trigger, compact && styles.compactTrigger, error && styles.invalid]}>{selected && renderLeading?.(selected)}<Text style={[styles.value, compact && styles.compactValue, !selected && styles.placeholder]} numberOfLines={1}>{selected?.label || placeholder}</Text><Icon name="chevronDown" color={colors.secondary} size={20} /></Pressable>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : hint && <Text style={styles.hint}>{hint}</Text>}
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fechar seleção" onPress={() => setVisible(false)} />
        <View accessibilityViewIsModal style={[styles.sheet, { marginTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.header}><Text style={styles.title}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar opções" hitSlop={12} onPress={() => setVisible(false)}><Icon name="close" /></Pressable></View>
          {searchable && <TextInput accessibilityLabel={`Buscar ${label.toLowerCase()}`} placeholder="Buscar por nome" placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} style={styles.search} autoCorrect={false} />}
          <FlatList
            key={numColumns}
            data={filtered}
            numColumns={numColumns}
            columnWrapperStyle={isGrid ? styles.gridRow : undefined}
            keyExtractor={item => String(item.value)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.value === value }}
              onPress={() => { onChange(item.value); setVisible(false); }}
              style={({ pressed }) => [styles.option, isGrid && styles.gridOption, isGrid && { maxWidth: `${100 / numColumns}%` }, pressed && styles.pressed]}
            >
              {isGrid ? <View style={[styles.gridIcon, item.value === value && styles.gridSelected]}>
                {renderOption ? renderOption(item) : renderLeading?.(item)}
              </View> : <>
                {renderLeading?.(item)}
                <Text style={styles.value}>{item.label}</Text>
                {item.value === value && <Icon name="check" color={colors.primary} />}
              </>}
            </Pressable>}
            ListEmptyComponent={<Text style={styles.hint}>Nenhuma opção encontrada.</Text>}
          />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  compactTrigger: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14 },
  compactValue: { fontSize: 13 },
  field: { gap: 7 }, trigger: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, value: { flex: 1, minWidth: 0, fontFamily, fontSize: 16, color: colors.text }, placeholder: { color: colors.secondary }, invalid: { borderColor: colors.error }, error: { fontFamily, fontSize: 13, color: colors.error }, hint: { fontFamily, fontSize: 13, lineHeight: 18, color: colors.secondary },
  overlay: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end', alignItems: 'center' }, sheet: { width: '100%', maxWidth: 460, maxHeight: '80%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, gap: 16 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { ...typography.title, fontSize: 22, lineHeight: 28, flex: 1 }, search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, fontFamily, fontSize: 16, color: colors.text }, list: { flexShrink: 1 }, option: { minHeight: 54, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridRow: { gap: 8, marginBottom: 8 },
  gridOption: { flex: 1, minHeight: 72, paddingHorizontal: 4, paddingVertical: 8, justifyContent: 'center' },
  gridIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  gridSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
});
