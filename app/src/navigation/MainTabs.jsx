import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import StatementScreen from '../screens/StatementScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AddFinancialItemScreen from '../screens/AddFinancialItemScreen';
import CreateCreditCardScreen from '../screens/CreateCreditCardScreen';
import { useOnboarding } from '../contexts/OnboardingContext';
import useCategories from '../hooks/useCategories';
import useAccounts from '../hooks/useAccounts';
import useToast from '../hooks/useToast';
import BottomNavigator from '../components/BottomNavigator';
import VoiceDrawer from '../components/VoiceDrawer';
import { createTransaction } from '../services/transactions';
import { colors } from '../theme';

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
      if (accountForm) { setAccountForm(accountForm.kind === 'choose' || accountForm.account ? null : { kind: 'choose' }); return true; }
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
  async function confirmTranscription(transcription) {
    try {
      const transaction = await createTransaction(transcription, onboarding?.session?.accessToken);
      showToast({ type: 'success', title: 'Transação registrada!', message: 'Seu lançamento foi salvo com sucesso.' });
      if (selected === 'AccountManagement') { accountList.retry(); }
      return transaction;
    } catch (failure) {
      showToast({ type: 'error', title: 'Não foi possível registrar', message: failure.message });
      throw failure;
    }
  }
  function renderContent() {
    if (selected === 'Home') { return <HomeScreen />; }
    if (selected === 'Statement') { return <StatementScreen profile={onboarding?.profile} accessToken={onboarding?.session?.accessToken} />; }
    if (selected === 'AccountManagement') {
      if (accountForm) {
        const close = () => setAccountForm(null);
        const back = () => accountForm.account ? close() : setAccountForm({ kind: 'choose' });
        if (accountForm.kind === 'choose') { return <AddFinancialItemScreen onCancel={close} onChoose={kind => setAccountForm({ kind, account: null })} />; }
        if (accountForm.kind === 'card') { return <CreateCreditCardScreen onCancel={back} onCreated={close} />; }
        return <CreateAccountScreen key={accountForm.account?.uuid || 'new-account'} route={{ params: { fromManagement: true, account: accountForm.account } }} navigation={{ goBack: back, reset: close }} />;
      }
      return <AccountsScreen {...accountList} profile={onboarding?.profile} onRetry={accountList.retry} onCreate={() => setAccountForm({ kind: 'choose' })} onEdit={account => setAccountForm({ kind: 'account', account })} onArchived={() => showToast({ type: 'info', message: 'As contas arquivadas estarão disponíveis quando o endpoint estiver pronto.' })} />;
    }
    if (categoryForm) {
      return <CategoryFormScreen key={categoryForm.category?.uuid ?? categoryForm.category?.name ?? 'new-category'} category={categoryForm.category} existingCategories={[...defaultCategories, ...categories]} saving={saving} onSave={saveCategory} onCancel={() => setCategoryForm(null)} />;
    }
    return <CategoriesScreen categories={categories} defaultCategories={defaultCategories} loading={loading} error={error} onRetry={retry} onCreate={() => setCategoryForm({ category: null })} onEdit={category => setCategoryForm({ category })} />;
  }
  return <View style={styles.background}>
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      <View style={styles.content}>{renderContent()}</View>
      {!accountForm && <BottomNavigator selected={selected} onSelect={key => { setCategoryForm(null); setAccountForm(null); setSelected(key); }} onMicrophone={() => setVoiceVisible(true)} microphoneOpen={voiceVisible} />}
    </View>
    <VoiceDrawer visible={voiceVisible} onClose={() => setVoiceVisible(false)} onConfirm={confirmTranscription} />
  </View>;
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
  content: { flex: 1, paddingBottom: 18 },
});
