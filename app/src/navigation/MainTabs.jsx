import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import SectionScreen from '../screens/SectionScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import { useOnboarding } from '../contexts/OnboardingContext';
import useCategories from '../hooks/useCategories';
import useAccounts from '../hooks/useAccounts';
import useToast from '../hooks/useToast';
import BottomNavigator from '../components/BottomNavigator';
import VoiceDrawer from '../components/VoiceDrawer';
import { colors } from '../theme';

const titles = { Statement: 'EXTRATO' };

export default function MainTabs() {
  const [selected, setSelected] = useState('Home');
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [accountForm, setAccountForm] = useState(null);
  const { showToast } = useToast();
  const onboarding = useOnboarding();
  const { categories, defaultCategories, loading, error, retry, saving, saveCategory: persistCategory } = useCategories(onboarding?.session?.accessToken, selected === 'Categories');
  const [categoryForm, setCategoryForm] = useState(null);
  const accountList = useAccounts(onboarding?.session?.accessToken, selected === 'AccountManagement' && !accountForm);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS !== 'android') { return; }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (accountForm) { setAccountForm(null); return true; }
      if (categoryForm) { setCategoryForm(null); return true; }
      if (selected === 'Home') { return false; }
      setSelected('Home'); return true;
    });
    return () => subscription.remove();
  }, [selected, categoryForm, accountForm]);
  async function saveCategory(values) {
    const saved = await persistCategory(values, categoryForm.category);
    if (saved) { setCategoryForm(null); }
  }
  function renderContent() {
    if (selected === 'Home') { return <HomeScreen />; }
    if (selected === 'AccountManagement') {
      if (accountForm) {
        const close = () => setAccountForm(null);
        return <CreateAccountScreen key={accountForm.account?.uuid || 'new-account'} route={{ params: { fromManagement: true, account: accountForm.account } }} navigation={{ goBack: close, reset: close }} />;
      }
      return <AccountsScreen {...accountList} profile={onboarding?.profile} onRetry={accountList.retry} onCreate={() => setAccountForm({ account: null })} onEdit={account => setAccountForm({ account })} onArchived={() => showToast({ type: 'info', message: 'As contas arquivadas estarão disponíveis quando o endpoint estiver pronto.' })} />;
    }
    if (selected !== 'Categories') { return <SectionScreen title={titles[selected]} />; }
    if (categoryForm) {
      return <CategoryFormScreen key={categoryForm.category?.uuid ?? categoryForm.category?.name ?? 'new-category'} category={categoryForm.category} existingCategories={[...defaultCategories, ...categories]} saving={saving} onSave={saveCategory} onCancel={() => setCategoryForm(null)} />;
    }
    return <CategoriesScreen categories={categories} defaultCategories={defaultCategories} loading={loading} error={error} onRetry={retry} onCreate={() => setCategoryForm({ category: null })} onEdit={category => setCategoryForm({ category })} />;
  }
  return <View style={styles.background}>
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      <View style={styles.content}>{renderContent()}</View>
      <BottomNavigator selected={selected} onSelect={key => { setCategoryForm(null); setAccountForm(null); setSelected(key); }} onMicrophone={() => setVoiceVisible(true)} microphoneOpen={voiceVisible} />
    </View>
    <VoiceDrawer visible={voiceVisible} onClose={() => setVoiceVisible(false)} />
  </View>;
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
  content: { flex: 1, paddingBottom: 18 },
});
