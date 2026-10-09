import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CategoryIcon from '../components/CategoryIcon';
import Icon from '../components/Icon';
import SelectionField from '../components/SelectionField';
import useToast from '../hooks/useToast';
import { categoryColors, categoryIcons, normalizeCategoryName } from '../data/categories';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';

const iconOptions = categoryIcons.map(([value, label]) => ({ value, label }));
const colorOptions = categoryColors.map(item => ({ value: item.key, label: item.label, background: item.background, foreground: item.foreground }));

export default function CategoryFormScreen({ category, existingCategories, onSave, onCancel, saving = false }) {
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || 'paw');
  const [color, setColor] = useState(category?.color || 'sage');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const palette = categoryColors.find(item => item.key === color) || categoryColors.find(item => item.key === 'gray');
  async function submit() {
    if (submitting.current || saving) { return; }
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Informe um nome com pelo menos 2 caracteres.'); showToast({ type: 'warn', message: 'Informe um nome com pelo menos 2 caracteres.' }); return; }
    if (existingCategories.some(item => item !== category && !(category?.uuid && item.uuid === category.uuid) && normalizeCategoryName(item.name) === normalizeCategoryName(trimmed))) {
      setError('Já existe uma categoria com esse nome.');
      showToast({ type: 'warn', message: 'Já existe uma categoria com esse nome.' }); return;
    }
    submitting.current = true;
    setError('');
    try {
      await onSave({ name: trimmed, icon, color });
      showToast({ type: 'success', title: category ? 'Categoria atualizada!' : 'Categoria criada!', message: 'As alterações foram salvas com sucesso.' });
    }
    catch (cause) {
      const message = cause.fieldErrors?.name || cause.message || 'Não foi possível salvar a categoria. Tente novamente.';
      setError(message);
      showToast({ type: 'error', title: 'Não foi possível salvar a categoria', message });
    }
    finally { submitting.current = false; }
  }
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Voltar às categorias" onPress={onCancel} style={styles.back}><Icon name="back" /></Pressable><Text accessibilityRole="header" style={styles.title}>{category ? 'Editar categoria' : 'Nova categoria'}</Text><View style={styles.back} /></View>
      <Text style={styles.subtitle}>{category ? 'Ajuste sua categoria como preferir.' : 'Crie uma categoria com a sua cara.'}</Text>
      <View style={styles.preview}><View style={[styles.previewIcon, { backgroundColor: palette.background }]}><CategoryIcon name={icon} size={42} color={palette.foreground} /></View><Text numberOfLines={2} style={styles.previewName}>{name.trim() || 'Sua categoria'}</Text><Text style={styles.previewLabel}>Prévia</Text></View>
      <Text style={styles.label}>Nome da categoria</Text>
      <TextInput accessibilityLabel="Nome da categoria" value={name} onChangeText={value => { setName(value); setError(''); }} placeholder="Ex.: Pets, viagens, estudos" placeholderTextColor={colors.secondary} maxLength={50} autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={submit} style={[styles.input, error && styles.invalid]} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.appearance}>
        <SelectionField label="Ícone" value={icon} options={iconOptions} onChange={setIcon} searchable numColumns={4}
          renderOption={option => <CategoryIcon name={option.value} size={30} color={palette.foreground} />}
          renderLeading={option => <View style={[styles.optionIcon, { backgroundColor: palette.background }]}><CategoryIcon name={option.value} size={23} color={palette.foreground} /></View>} />
        <SelectionField label="Cor" value={color} options={colorOptions} onChange={setColor} searchable numColumns={4}
          renderOption={option => <View style={[styles.colorSwatch, styles.colorOption, { backgroundColor: option.background, borderColor: option.foreground }]} />}
          renderLeading={option => <View style={[styles.colorSwatch, { backgroundColor: option.background, borderColor: option.foreground }]} />} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={category ? 'Salvar categoria' : 'Criar categoria'} accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={submit} style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}><Text style={styles.saveText}>{saving ? 'Salvando...' : category ? 'Salvar alterações' : 'Criar categoria'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar criação de categoria" disabled={saving} onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center' },
  back: { minWidth: 40, minHeight: 44, justifyContent: 'center' },
  title: { flex: 1, fontFamily: fontFamilyBold, fontSize: 23, fontWeight: '700', textAlign: 'center', color: colors.text },
  subtitle: { fontFamily, fontSize: 15, lineHeight: 22, color: colors.secondary, textAlign: 'center', marginTop: 5 },
  preview: { alignItems: 'center', paddingVertical: 20, gap: 5, backgroundColor: colors.surface, borderRadius: 24, marginVertical: 20 },
  previewIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  previewName: { fontFamily: fontFamilyBold, fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  previewLabel: { fontFamily, fontSize: 14, color: colors.secondary },
  label: { fontFamily: fontFamilyMedium, fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 10 },
  input: { fontFamily, fontSize: 16, color: colors.text, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50 },
  invalid: { borderColor: colors.error },
  error: { fontFamily, fontSize: 13, color: colors.error, marginTop: 8 },
  appearance: { marginTop: 24, gap: 18 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  colorOption: { width: 36, height: 36, borderRadius: 18 },
  save: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 16, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  saveText: { fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  cancelText: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '500', color: colors.secondary },
  pressed: { opacity: 0.7 },
});
