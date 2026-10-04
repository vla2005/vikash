import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchFinancialInstitutions } from '../constants/financialInstitutions';
import useFinancialInstitutions from '../hooks/useFinancialInstitutions';
import { colors, fontFamily, typography } from '../theme';
import Icon from './Icon';
import InstitutionLogo from './InstitutionLogo';

export default function FinancialInstitutionPicker({ value, selectedInstitution, onChange, required = false, error: fieldError }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const { institutions: catalog, loading, error, retry } = useFinancialInstitutions(visible);
  const selected = catalog.find(item => item.id === value) || (selectedInstitution?.id === value ? selectedInstitution : null);
  const institutions = searchFinancialInstitutions(catalog, query);

  function open() {
    Keyboard.dismiss();
    setQuery('');
    setVisible(true);
  }

  function select(institution) {
    onChange(institution?.id || null, institution || null);
    Keyboard.dismiss();
    setVisible(false);
  }

  return <View style={styles.field}>
    <Text style={typography.label}>Instituição financeira{!required && <Text style={styles.optional}> (opcional)</Text>}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={selected ? `Instituição financeira: ${selected.name}` : 'Selecionar instituição financeira'} accessibilityState={{ expanded: visible }} onPress={open} style={styles.trigger}>
      <InstitutionLogo institution={selected} />
      <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>{selected?.name || 'Selecione seu banco ou conta digital'}</Text>
      <Icon name="chevronDown" size={20} color={colors.secondary} />
    </Pressable>
    {fieldError && <Text accessibilityRole="alert" style={styles.fieldError}>{fieldError}</Text>}
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar seleção de instituição" onPress={() => setVisible(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, { marginTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Sua instituição</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar busca" onPress={() => setVisible(false)} hitSlop={12}><Icon name="close" /></Pressable>
          </View>
          <Text style={styles.description}>Encontre seu banco ou conta digital.</Text>
          <View style={styles.search}>
            <Icon name="search" color={colors.secondary} size={21} />
            <TextInput accessibilityLabel="Buscar instituição financeira" placeholder="Buscar por nome" placeholderTextColor={colors.secondary} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={styles.searchInput} />
            {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQuery('')} hitSlop={8}><Icon name="close" size={18} color={colors.secondary} /></Pressable>}
          </View>
          {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Carregando instituições" style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={styles.description}>Carregando instituições…</Text></View>
            : error ? <View style={styles.empty}><Text accessibilityRole="alert" style={styles.emptyTitle}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar novamente" onPress={retry} style={styles.retry}><Text style={styles.skipText}>Tentar novamente</Text></Pressable></View>
            : <FlatList data={institutions} keyExtractor={item => String(item.id)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.list}
            renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === value }} onPress={() => select(item)} style={({ pressed }) => [styles.option, item.id === value && styles.selected, pressed && styles.pressed]}>
              <InstitutionLogo institution={item} />
              <Text style={styles.optionName}>{item.name}</Text>
              {item.id === value && <Icon name="check" color={colors.primary} size={21} />}
            </Pressable>}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{catalog.length ? 'Nenhuma instituição encontrada.' : 'Nenhuma instituição disponível.'}</Text><Text style={styles.description}>{catalog.length ? 'Tente outro nome ou continue sem instituição.' : 'Você pode continuar sem instituição.'}</Text></View>} />}
          {!required && <Pressable accessibilityRole="button" onPress={() => select(null)} style={styles.skip}><Text style={styles.skipText}>Continuar sem instituição</Text></Pressable>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  fieldError: { color: colors.error, fontFamily, fontSize: 13, lineHeight: 18 },
  optional: { fontWeight: '400', fontSize: 12 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  value: { flex: 1, fontFamily, fontSize: 15, color: colors.text },
  placeholder: { color: colors.secondary },
  overlay: { flex: 1, backgroundColor: 'rgba(37,40,36,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '85%', backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  title: { ...typography.title, fontSize: 24, lineHeight: 30 },
  description: { ...typography.body, fontSize: 14, lineHeight: 20, marginTop: 7 },
  search: { marginTop: 22, marginBottom: 14, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  searchInput: { flex: 1, minWidth: 0, fontFamily, color: colors.text, fontSize: 16, paddingVertical: 14 },
  list: { flexShrink: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12 },
  selected: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.6 },
  optionName: { flex: 1, fontFamily, color: colors.text, fontSize: 16 },
  empty: { paddingVertical: 24, gap: 5 },
  emptyTitle: { fontFamily, fontSize: 16, color: colors.text, fontWeight: '500' },
  retry: { alignSelf: 'flex-start', paddingVertical: 14, minHeight: 44 },
  skip: { marginTop: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  skipText: { fontFamily, fontSize: 14, color: colors.primary, fontWeight: '500' },
});
