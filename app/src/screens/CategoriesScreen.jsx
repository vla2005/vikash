import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '../components/Icon';
import CategoryIcon from '../components/CategoryIcon';
import { categoryColors, normalizeCategoryName } from '../data/categories';
import { fontFamilyMedium, fontFamilyBold, colors, fontFamily } from '../theme';

export default function CategoriesScreen({ categories, defaultCategories, loading, error, onRetry, onCreate, onEdit }) {
  const [search, setSearch] = useState('');
  const query = normalizeCategoryName(search);
  const filter = items => items.filter(item => normalizeCategoryName(item.name).includes(query));
  function group(title, items, custom) {
    return <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {items.length ? <View style={[styles.list, !custom && styles.categoryGrid]}>{items.map((item, index) => {
        const palette = categoryColors.find(color => color.key === item.color) || categoryColors.find(color => color.key === 'gray');
        const content = <><View style={[styles.tile, { backgroundColor: palette.background }]}><CategoryIcon name={item.icon} color={palette.foreground} /></View><Text style={styles.name}>{item.name}</Text>{custom && <Icon name="edit" size={21} color={colors.secondary} />}</>;
        const rowStyle = [styles.row, custom ? index > 0 && styles.separator : styles.defaultCategory];
        return custom ? <Pressable key={item.uuid ?? item.name} accessibilityRole="button" accessibilityLabel={`Editar categoria ${item.name}`} onPress={() => onEdit(item)} style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}>{content}</Pressable> : <View key={item.uuid ?? item.name} style={rowStyle}>{content}</View>;
      })}</View> : <Text style={styles.empty}>{query ? 'Nenhuma categoria encontrada.' : 'Suas categorias aparecerão aqui.'}</Text>}
    </View>;
  }
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Categorias</Text><Pressable accessibilityRole="button" accessibilityLabel="Adicionar categoria" onPress={onCreate} style={styles.add}><Icon name="plus" color={colors.primary} size={30} /></Pressable></View>
    <Text style={styles.subtitle}>Organize seus gastos do seu jeito.</Text>
    <View style={styles.search}><Icon name="search" size={21} color={colors.secondary} /><TextInput accessibilityLabel="Buscar categoria" placeholder="Buscar categoria" placeholderTextColor={colors.secondary} value={search} onChangeText={setSearch} style={styles.searchInput} returnKeyType="search" /></View>
    {loading ? <Text style={[styles.empty, styles.section]}>Carregando categorias...</Text> : error ? <View style={styles.section}><Text accessibilityRole="alert" style={styles.empty}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tentar carregar categorias novamente" onPress={onRetry} style={styles.add}><Text style={styles.empty}>Tentar novamente</Text></Pressable></View> : <>{group('Padrão', filter(defaultCategories), false)}{group('Personalizadas', filter(categories), true)}</>}
    <Pressable accessibilityRole="button" accessibilityLabel="Criar categoria" onPress={onCreate} style={({ pressed }) => [styles.create, pressed && styles.pressed]}><Icon name="plus" color="#FFFFFF" size={20} /><Text style={styles.createText}>Criar categoria</Text></Pressable>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fontFamilyBold, fontSize: 32, fontWeight: '700', letterSpacing: -1, color: colors.text },
  add: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily, fontSize: 15, lineHeight: 22, color: colors.secondary, marginTop: 5 },
  search: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, minHeight: 52 },
  searchInput: { flex: 1, fontFamily, fontSize: 16, color: colors.text, paddingVertical: 12 },
  section: { marginTop: 24 },
  sectionTitle: { fontFamily: fontFamilyBold, fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  list: { backgroundColor: '#FFFFFF', borderRadius: 22, overflow: 'hidden' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  defaultCategory: { width: '50%', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 12, minHeight: 92 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 58, paddingVertical: 9, paddingHorizontal: 14 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAEA' },
  tile: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily, fontSize: 16, color: colors.text },
  empty: { fontFamily, fontSize: 14, lineHeight: 21, color: colors.secondary },
  create: { marginTop: 24, minHeight: 50, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#FFFFFF', fontFamily: fontFamilyMedium, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
