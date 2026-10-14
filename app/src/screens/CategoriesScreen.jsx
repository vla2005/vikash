import { pointerEventsStyles } from '../theme/interaction';
import {
  useInputTheme,
  useThemeStyles,
  useTheme,
} from '../contexts/ThemeContext';
import React, { memo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import ScrollView from '../components/silver/DockScrollView';
import CategoryBadge from '../components/CategoryBadge';
import ConfirmationDialog from '../components/ConfirmationDialog';
import Icon from '../components/Icon';
import SwipeableRow from '../components/SwipeableRow';
import Skeleton, { SkeletonGroup } from '../components/Skeleton';
import { normalizeCategoryName } from '../data/categories';
import { fontFamilyMedium, fontFamilyBold, fontFamily } from '../theme';
import GlassPanel from '../components/silver/GlassPanel';
import SpendingOverview from '../components/silver/SpendingOverview';
import useDashboard from '../hooks/useDashboard';
import { formatCurrency } from '../utils/money';

function CategorySkeleton() {
  const styles = useThemeStyles(createStyles);
  return (
    <SkeletonGroup label="Carregando categorias" style={styles.section}>
      <Skeleton style={styles.placeholderHeading} />
      <View style={styles.categoryGrid}>
        {Array.from({ length: 6 }, (_, index) => (
          <View key={index} style={styles.defaultCategory}>
            <Skeleton style={styles.placeholderIcon} />
            <Skeleton style={styles.placeholderName} />
          </View>
        ))}
      </View>
      <Skeleton style={styles.placeholderList} />
    </SkeletonGroup>
  );
}

function CategoriesScreen({
  categories = [],
  defaultCategories = [],
  accessToken,
  revision = 0,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}) {
  const inputTheme = useInputTheme();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [search, setSearch] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteInProgress = useRef(false);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const report = useDashboard(
    month.getFullYear(),
    month.getMonth() + 1,
    accessToken,
    revision,
  );
  const distribution = [...(report.data?.expensesPerCategory || [])].sort(
    (a, b) => b.total - a.total,
  );
  const categoryTotal = item =>
    distribution.find(entry =>
      entry.customCategoryUuid && item.uuid
        ? entry.customCategoryUuid === item.uuid
        : normalizeCategoryName(entry.name) ===
          normalizeCategoryName(item.name),
    )?.total ?? 0;
  const compact = useWindowDimensions().width < 350;
  const query = normalizeCategoryName(search);
  const filter = items =>
    items.filter(item => normalizeCategoryName(item.name).includes(query));
  function requestDelete(category) {
    setOpenRow(null);
    setDeleteError('');
    setCategoryToDelete(category);
  }
  async function confirmDelete() {
    if (!categoryToDelete || deleteInProgress.current) {
      return;
    }
    deleteInProgress.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      // The parent receives the original category, including its UUID, for the future API call.
      await onDelete?.(categoryToDelete);
      setCategoryToDelete(null);
    } catch (failure) {
      setDeleteError(
        failure?.message ||
          'Não foi possível excluir a categoria. Tente novamente.',
      );
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  }
  function group(title, items, custom) {
    return (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {items.length ? (
          <>
            <GlassPanel style={styles.list}>
              {items.map((item, index) =>
                custom ? (
                  <SwipeableRow
                    key={item.uuid ?? item.name}
                    label={`Editar categoria ${item.name}`}
                    actionLabel={`Excluir categoria ${item.name}`}
                    open={openRow === (item.uuid ?? item.name)}
                    onOpenChange={open =>
                      setOpenRow(open ? item.uuid ?? item.name : null)
                    }
                    onPress={() => {
                      setOpenRow(null);
                      onEdit(item);
                    }}
                    onAction={() => requestDelete(item)}
                    style={styles.row}
                  >
                    {index > 0 && (
                      <View style={[styles.separator, pointerEventsStyles.none]} />
                    )}
                    <CategoryBadge category={item} vivid />
                    <Text style={styles.name}>{item.name}</Text>
                    {report.data && (
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(categoryTotal(item))}
                      </Text>
                    )}
                    <Icon name="edit" size={23} color={colors.secondary} />
                  </SwipeableRow>
                ) : (
                  <View key={item.uuid ?? item.name} style={styles.row}>
                    {index > 0 && (
                      <View style={[styles.separator, pointerEventsStyles.none]} />
                    )}
                    <CategoryBadge
                      category={item}
                      size={38}
                      iconSize={24}
                      vivid
                    />
                    <Text style={styles.name}>{item.name}</Text>
                    {report.data && (
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(categoryTotal(item))}
                      </Text>
                    )}
                  </View>
                ),
              )}
            </GlassPanel>
            {custom && (
              <Text style={styles.hint}>
                Toque para editar. Arraste para a esquerda para excluir.
              </Text>
            )}
          </>
        ) : (
          <View style={custom && styles.emptyCustom}>
            <Text style={styles.empty}>
              {query
                ? 'Nenhuma categoria encontrada.'
                : custom
                ? 'Use “Nova” para criar sua primeira categoria.'
                : 'Nenhuma categoria padrão disponível.'}
            </Text>
          </View>
        )}
      </View>
    );
  }
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setOpenRow(null)}
      >
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, compact && styles.compactTitle]}
          >
            Categorias
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Criar categoria"
            onPress={onCreate}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Icon name="plus" color={colors.text} size={21} />
            <Text style={styles.addText}>Nova</Text>
          </Pressable>
        </View>
        {accessToken && (
          <SpendingOverview
            month={month}
            onMove={offset =>
              setMonth(
                previous =>
                  new Date(
                    previous.getFullYear(),
                    previous.getMonth() + offset,
                    1,
                  ),
              )
            }
            report={report}
            distribution={distribution}
          />
        )}
        <View style={styles.search}>
          <Icon name="search" size={22} color={colors.secondary} />
          <TextInput
            {...inputTheme}
            accessibilityLabel="Buscar categoria"
            placeholder="Buscar categoria"
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={value => {
              setSearch(value);
              setOpenRow(null);
            }}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        {loading ? (
          <CategorySkeleton />
        ) : error ? (
          <View style={styles.feedback}>
            <Icon name="info" size={25} color={colors.error} />
            <Text accessibilityRole="alert" style={styles.empty}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar categorias novamente"
              onPress={onRetry}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {group('Do app', filter(defaultCategories), false)}
            {group('Suas categorias', filter(categories), true)}
          </>
        )}
      </ScrollView>
      <ConfirmationDialog
        visible={!!categoryToDelete}
        title="Excluir categoria?"
        message={`Deseja excluir a categoria “${
          categoryToDelete?.name || ''
        }”? Os lançamentos serão mantidos e ficarão sem esta categoria.`}
        confirmText="Excluir"
        variant="danger"
        icon="trash"
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteInProgress.current) {
            setCategoryToDelete(null);
          }
        }}
      />
    </>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flexShrink: 1,
      fontFamily: fontFamilyBold,
      fontSize: 34,
      lineHeight: 44,
      fontWeight: '700',
      letterSpacing: -1.2,
      color: colors.text,
    },
    compactTitle: { fontSize: 30, lineHeight: 40 },
    add: {
      minHeight: 44,
      borderRadius: 16,
      paddingHorizontal: 15,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      fontFamily: fontFamilyMedium,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    subtitle: {
      fontFamily,
      fontSize: 15,
      lineHeight: 24,
      color: colors.secondary,
      marginTop: 3,
    },
    search: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 15,
      minHeight: 48,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontFamily,
      fontSize: 15,
      lineHeight: 23,
      color: colors.text,
      paddingVertical: 12,
    },
    section: { marginTop: 24 },
    sectionTitle: {
      fontFamily: fontFamilyBold,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: colors.text,
      marginBottom: 10,
    },
    list: { marginHorizontal: -3 },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 18,
      marginHorizontal: -9,
    },
    defaultCategory: {
      width: '33.333333%',
      paddingHorizontal: 3,
      alignItems: 'center',
      gap: 9,
    },
    defaultName: {
      alignSelf: 'stretch',
      fontFamily,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
      textAlign: 'center',
    },
    compactName: { fontSize: 13 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      minHeight: 64,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: 'transparent',
    },
    categoryAmount: {
      fontFamily: fontFamilyMedium,
      fontSize: 13,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    separator: {
      position: 'absolute',
      top: 0,
      left: 14,
      right: 14,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    name: {
      flex: 1,
      fontFamily,
      fontSize: 14,
      lineHeight: 23,
      color: colors.text,
    },
    hint: {
      fontFamily,
      fontSize: 11,
      lineHeight: 16,
      color: colors.secondary,
      marginTop: 6,
      marginLeft: 6,
    },
    empty: {
      fontFamily,
      fontSize: 14,
      lineHeight: 22,
      color: colors.secondary,
    },
    emptyCustom: {
      padding: 18,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    feedback: {
      marginTop: 24,
      alignItems: 'flex-start',
      gap: 12,
      padding: 20,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    retry: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
    },
    retryText: {
      fontFamily: fontFamilyMedium,
      fontSize: 14,
      color: colors.primary,
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    placeholderHeading: { height: 24, width: 100, marginBottom: 20 },
    placeholderIcon: { width: 52, height: 52, borderRadius: 14 },
    placeholderName: { width: '70%', height: 14, marginTop: 5 },
    placeholderList: { height: 156, borderRadius: 20, marginTop: 30 },
  });

export default memo(CategoriesScreen);
