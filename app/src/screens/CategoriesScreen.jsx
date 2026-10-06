import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import CategoryBadge from '../components/CategoryBadge';
import ConfirmationDialog from '../components/ConfirmationDialog';
import Icon from '../components/Icon';
import SwipeableRow from '../components/SwipeableRow';
import { normalizeCategoryName } from '../data/categories';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';

function CategorySkeleton() {
  return <View accessibilityLabel="Carregando categorias" accessibilityState={{ busy: true }} style={styles.section}>
    <View style={[styles.placeholder, styles.placeholderHeading]} />
    <View style={styles.categoryGrid}>
      {Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.defaultCategory}>
        <View style={[styles.placeholder, styles.placeholderIcon]} />
        <View style={[styles.placeholder, styles.placeholderName]} />
      </View>)}
    </View>
    <View style={[styles.placeholder, styles.placeholderList]} />
  </View>;
}

export default function CategoriesScreen({ profile, categories = [], defaultCategories = [], loading, error, onRetry, onCreate, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteInProgress = useRef(false);
  const compact = useWindowDimensions().width < 350;
  const query = normalizeCategoryName(search);
  const filter = items => items.filter(item => normalizeCategoryName(item.name).includes(query));
  const nameParts = (profile?.name || '').trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.filter((_, index) => index === 0 || index === nameParts.length - 1)
    .map(part => part[0]).join('').toUpperCase() || 'V';
  function requestDelete(category) {
    setOpenRow(null);
    setDeleteError('');
    setCategoryToDelete(category);
  }
  async function confirmDelete() {
    if (!categoryToDelete || deleteInProgress.current) { return; }
    deleteInProgress.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      // The parent receives the original category, including its UUID, for the future API call.
      await onDelete?.(categoryToDelete);
      setCategoryToDelete(null);
    } catch (failure) {
      setDeleteError(failure?.message || 'Não foi possível excluir a categoria. Tente novamente.');
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  }
  function group(title, items, custom) {
    return <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {items.length ? <>
        <View style={custom ? styles.list : styles.categoryGrid}>{items.map((item, index) => custom
          ? <SwipeableRow key={item.uuid ?? item.name} label={`Editar categoria ${item.name}`} actionLabel={`Excluir categoria ${item.name}`}
            open={openRow === (item.uuid ?? item.name)} onOpenChange={open => setOpenRow(open ? (item.uuid ?? item.name) : null)}
            onPress={() => { setOpenRow(null); onEdit(item); }} onAction={() => requestDelete(item)} style={styles.row}>
            {index > 0 && <View pointerEvents="none" style={styles.separator} />}
            <CategoryBadge category={item} />
            <Text style={styles.name}>{item.name}</Text>
            <Icon name="edit" size={23} color={colors.secondary} />
          </SwipeableRow>
          : <View key={item.uuid ?? item.name} style={styles.defaultCategory}>
            <CategoryBadge category={item} size={52} iconSize={34} />
            <Text style={[styles.defaultName, compact && styles.compactName]}>{item.name}</Text>
          </View>)}</View>
        {custom && <Text style={styles.hint}>Toque para editar. Arraste para a esquerda para excluir.</Text>}
      </> : <View style={custom && styles.emptyCustom}><Text style={styles.empty}>{query
        ? 'Nenhuma categoria encontrada.'
        : custom ? 'Use “Nova” para criar sua primeira categoria.' : 'Nenhuma categoria padrão disponível.'}</Text></View>}
    </View>;
  }
  return <><ScrollView contentContainerStyle={[styles.content, compact && styles.compactContent]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    onScrollBeginDrag={() => setOpenRow(null)}>
    <View style={styles.brandHeader}>
      <BrandLogo width={126} />
      <View accessibilityLabel={profile?.name || 'Seu perfil'} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
    </View>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>Categorias</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Criar categoria" onPress={onCreate} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Icon name="plus" color={colors.surface} size={21} /><Text style={styles.addText}>Nova</Text>
      </Pressable>
    </View>
    <Text style={styles.subtitle}>Seu dinheiro, organizado.</Text>
    <View style={styles.search}><Icon name="search" size={22} color={colors.secondary} /><TextInput accessibilityLabel="Buscar categoria" placeholder="Buscar categoria" placeholderTextColor={colors.secondary} value={search} onChangeText={value => { setSearch(value); setOpenRow(null); }} style={styles.searchInput} returnKeyType="search" /></View>
    {loading ? <CategorySkeleton /> : error ? <View style={styles.feedback}>
      <Icon name="info" size={25} color={colors.error} />
      <Text accessibilityRole="alert" style={styles.empty}>{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar categorias novamente" onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
    </View> : <>{group('Do app', filter(defaultCategories), false)}{group('Suas categorias', filter(categories), true)}</>}
  </ScrollView>
    <ConfirmationDialog visible={!!categoryToDelete} title="Excluir categoria?" message={`Deseja excluir a categoria “${categoryToDelete?.name || ''}”?`}
      confirmText="Excluir" variant="danger" icon="trash" loading={deleting} error={deleteError} onConfirm={confirmDelete}
      onCancel={() => { if (!deleteInProgress.current) { setCategoryToDelete(null); } }} />
  </>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  compactContent: { paddingHorizontal: 16 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCE3FF', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamilyBold, fontSize: 15, fontWeight: '700', color: colors.text },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontFamily: fontFamilyBold, fontSize: 34, lineHeight: 44, fontWeight: '700', letterSpacing: -1.2, color: colors.text },
  compactTitle: { fontSize: 30, lineHeight: 40 },
  add: { minHeight: 44, borderRadius: 13, paddingHorizontal: 15, backgroundColor: colors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fontFamilyMedium, fontSize: 15, fontWeight: '600', color: colors.surface },
  subtitle: { fontFamily, fontSize: 15, lineHeight: 24, color: colors.secondary, marginTop: 3 },
  search: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderRadius: 17, paddingHorizontal: 15, minHeight: 48 },
  searchInput: { flex: 1, minWidth: 0, fontFamily, fontSize: 15, lineHeight: 23, color: colors.text, paddingVertical: 12 },
  section: { marginTop: 16 },
  sectionTitle: { fontFamily: fontFamilyBold, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.5, color: colors.text, marginBottom: 10 },
  list: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', marginHorizontal: -3 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 9, marginHorizontal: -9 },
  defaultCategory: { width: '33.333333%', paddingHorizontal: 3, alignItems: 'center', gap: 6 },
  defaultName: { alignSelf: 'stretch', fontFamily, fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center' },
  compactName: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 50, paddingVertical: 6, paddingHorizontal: 14 },
  separator: { position: 'absolute', top: 0, left: 14, right: 14, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  name: { flex: 1, fontFamily, fontSize: 14, lineHeight: 23, color: colors.text },
  hint: { fontFamily, fontSize: 11, lineHeight: 16, color: colors.secondary, marginTop: 6, marginLeft: 6 },
  empty: { fontFamily, fontSize: 14, lineHeight: 22, color: colors.secondary },
  emptyCustom: { padding: 18, backgroundColor: colors.surface, borderRadius: 20 },
  feedback: { marginTop: 24, alignItems: 'flex-start', gap: 12, padding: 20, borderRadius: 20, backgroundColor: colors.surface },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primarySoft },
  retryText: { fontFamily: fontFamilyMedium, fontSize: 14, color: colors.primary },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  placeholder: { backgroundColor: colors.border, borderRadius: 8 },
  placeholderHeading: { height: 24, width: 100, marginBottom: 20 },
  placeholderIcon: { width: 52, height: 52, borderRadius: 14 },
  placeholderName: { width: '70%', height: 14, marginTop: 5 },
  placeholderList: { height: 156, borderRadius: 20, marginTop: 30 },
});
