import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import DrawerPanel from './DrawerPanel';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';

export const emptyFilters = () => ({ accounts: [], categories: [], payments: [], min: '', max: '', transfers: true });
export const countFilters = filters => ['accounts', 'categories', 'payments'].filter(key => filters[key].length).length + Number(!!filters.min || !!filters.max) + Number(!filters.transfers);
export default function StatementFilters({ visible, initial, accounts, categories, payments, onClose, onApply }) {
  const [draft, setDraft] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const toggle = (key, value) => setDraft(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value] }));
  function chips(key, values) {
    return <View style={s.chips}>{values.map(value => <Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={`${key}: ${value}`} accessibilityState={{ checked: draft[key].includes(value) }} aria-checked={draft[key].includes(value)} onPress={() => toggle(key, value)} style={[s.chip, draft[key].includes(value) && s.selected]}><Text style={[s.chipText, draft[key].includes(value) && s.blue]}>{draft[key].includes(value) ? '✓  ' : ''}{value}</Text></Pressable>)}</View>;
  }
  function apply() {
    const number = value => Number(value.replace(',', '.'));
    if ([draft.min, draft.max].some(value => value && (!Number.isFinite(number(value)) || number(value) < 0)) || (draft.min && draft.max && number(draft.min) > number(draft.max))) {
      setError('Informe valores positivos e um máximo maior ou igual ao mínimo.'); return;
    }
    onApply(draft);
  }
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={s.overlay}><Pressable accessibilityLabel="Fechar filtros" onPress={onClose} style={s.backdrop} />
      <DrawerPanel visible={visible} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: '90%' }]}>
        <View style={s.handle} /><View style={s.heading}><Text style={s.title}>Filtrar extrato</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancelar filtros" onPress={onClose} style={s.close}><Icon name="close" size={24} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.label}>Contas</Text><Text style={s.hint}>Selecione uma ou mais</Text>
          <Pressable accessibilityRole="button" onPress={() => setDraft(previous => ({ ...previous, accounts: [] }))} style={[s.chip, !draft.accounts.length && s.selected]}><Text style={s.chipText}>Todas</Text></Pressable>{chips('accounts', accounts)}
          <Text style={s.label}>Categorias</Text><Pressable accessibilityRole="button" accessibilityLabel="Selecionar categorias do filtro" onPress={() => setExpanded(value => !value)} style={s.dropdown}><Text style={s.dropdownText}>{draft.categories.join(', ') || 'Todas as categorias'}</Text><Icon name="chevronDown" size={18} /></Pressable>
          {expanded && chips('categories', categories)}<Text style={s.hint}>Você pode selecionar várias categorias</Text>
          <Text style={s.label}>Forma de pagamento</Text>{chips('payments', payments)}
          <Text style={s.label}>Faixa de valor</Text><View style={s.range}>{[['min', 'Mínimo', '0,00'], ['max', 'Máximo', 'Sem limite']].map(([key, label, placeholder]) => <View key={key} style={s.field}><Text style={s.hint}>{label}</Text><TextInput accessibilityLabel={`Valor ${label.toLowerCase()}`} keyboardType="decimal-pad" placeholder={placeholder} value={draft[key]} onChangeText={value => { setError(''); setDraft(previous => ({ ...previous, [key]: value })); }} style={s.input} /></View>)}</View>
          <View style={s.switch}><Text style={s.dropdownText}>Incluir transferências entre contas</Text><Switch accessibilityLabel="Incluir transferências entre contas" value={draft.transfers} onValueChange={transfers => setDraft(previous => ({ ...previous, transfers }))} trackColor={{ true: colors.primary, false: '#DADCE1' }} /></View>
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        </ScrollView>
        <Text style={s.count}>{countFilters(draft)} filtros selecionados</Text><Pressable accessibilityRole="button" accessibilityLabel="Aplicar filtros" onPress={apply} style={s.primary}><Text style={s.primaryText}>Aplicar filtros</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Limpar filtros" onPress={() => { setDraft(emptyFilters()); setError(''); }} style={s.clear}><Text style={s.blue}>Limpar filtros</Text></Pressable>
      </DrawerPanel>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' }, backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.dialogBackdrop },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22 }, handle: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#B6BAC3', alignSelf: 'center', marginBottom: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontFamily: fontFamilyBold, fontSize: 25, fontWeight: '700', color: colors.text }, close: { padding: 10 },
  label: { fontFamily: fontFamilyMedium, fontWeight: '600', fontSize: 17, marginTop: 18, marginBottom: 8, color: colors.text }, hint: { fontFamily, fontSize: 12, color: colors.secondary, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, chip: { borderWidth: 1, borderColor: '#C9CDD7', borderRadius: 13, paddingHorizontal: 14, minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' }, selected: { backgroundColor: '#E5EFFF', borderColor: colors.primary }, chipText: { fontFamily, color: '#4C5364', fontSize: 14 }, blue: { fontFamily, color: colors.primary, fontSize: 15 },
  dropdown: { borderRadius: 12, borderWidth: 1, borderColor: '#DADDE4', backgroundColor: '#F6F7F9', padding: 14, flexDirection: 'row', gap: 8, marginBottom: 6 }, dropdownText: { fontFamily, fontSize: 14, color: colors.text, flex: 1 }, range: { flexDirection: 'row', gap: 12 }, field: { flex: 1, borderWidth: 1, borderColor: '#CFD3DC', borderRadius: 12, padding: 12 }, input: { fontFamily, fontSize: 16, color: colors.text, paddingVertical: 4 }, switch: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DFE2E8', borderRadius: 12, padding: 12, marginTop: 18, gap: 8 },
  count: { fontFamily, color: colors.secondary, fontSize: 12, textAlign: 'center', marginVertical: 12 }, primary: { backgroundColor: colors.primary, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, primaryText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: '#FFF' }, clear: { alignItems: 'center', padding: 16 }, error: { fontFamily, color: '#A3322C', marginTop: 12 },
});
