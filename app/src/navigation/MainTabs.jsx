import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import StatementScreen from '../screens/StatementScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CreateCreditCardScreen from '../screens/CreateCreditCardScreen';
import CreditCardDetailsScreen from '../screens/CreditCardDetailsScreen';
import AccountDetailsScreen from '../screens/AccountDetailsScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import CreditCardPurchaseDetailsScreen from '../screens/CreditCardPurchaseDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { useOnboarding } from '../contexts/OnboardingContext';
import useCategories from '../hooks/useCategories';
import useAccounts from '../hooks/useAccounts';
import useCreditCards from '../hooks/useCreditCards';
import useToast from '../hooks/useToast';
import BottomNavigator from '../components/BottomNavigator';
import AppHeader from '../components/AppHeader';
import VoiceDrawer from '../components/VoiceDrawer';
import { createTransaction } from '../services/transactions';
import { colors } from '../theme';

export default function MainTabs() {
  const [selected, setSelected] = useState('Home');
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [accountForm, setAccountForm] = useState(null);
  const [cardUuid, setCardUuid] = useState(null);
  const [cardRevision, setCardRevision] = useState(0);
  const [accountUuid, setAccountUuid] = useState(null);
  const [accountRevision, setAccountRevision] = useState(0);
  const [dashboardRevision, setDashboardRevision] = useState(0);
  const [itemDetails, setItemDetails] = useState(null);
  const [invoiceToOpen, setInvoiceToOpen] = useState(null);
  const { showToast } = useToast();
  const onboarding = useOnboarding();
  const { categories, defaultCategories, loading, error, retry, saving, saveCategory: persistCategory } = useCategories(onboarding?.session?.accessToken, selected === 'Categories');
  const [categoryForm, setCategoryForm] = useState(null);
  const accountList = useAccounts(onboarding?.session?.accessToken, selected === 'AccountManagement' && !accountForm && !cardUuid && !accountUuid);
  const cardList = useCreditCards(onboarding?.session?.accessToken, selected === 'AccountManagement' && !accountForm && !cardUuid && !accountUuid);
  const insets = useSafeAreaInsets();
  const showAppHeader = !profileVisible && !itemDetails
    && !(selected === 'AccountManagement' && (accountForm || cardUuid || accountUuid))
    && !(selected === 'Categories' && categoryForm);
  useEffect(() => {
    if (Platform.OS !== 'android') { return; }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (profileVisible && profileForm) { setProfileForm(null); return true; }
      if (profileVisible) { setProfileVisible(false); return true; }
      if (itemDetails) { setItemDetails(null); return true; }
      if (accountForm) { setAccountForm(null); return true; }
      if (cardUuid) { setCardUuid(null); return true; }
      if (accountUuid) { setAccountUuid(null); return true; }
      if (categoryForm) { setCategoryForm(null); return true; }
      if (selected === 'Home') { return false; }
      setSelected('Home'); return true;
    });
    return () => subscription.remove();
  }, [selected, categoryForm, accountForm, cardUuid, accountUuid, itemDetails, profileVisible, profileForm]);
  function openDetails(row, invoiceUuid) {
    setInvoiceToOpen(null);
    setItemDetails({ uuid: row.purchaseUuid || row.id, purchase: !!row.purchaseUuid, invoiceUuid });
  }
  function openInvoice(card, invoice) {
    setItemDetails(null); setAccountUuid(null); setSelected('AccountManagement');
    setCardUuid(card); setInvoiceToOpen(invoice);
  }
  function openAccount(uuid) {
    setItemDetails(null); setCardUuid(null); setInvoiceToOpen(null); setAccountForm(null);
    setAccountUuid(uuid); setSelected('AccountManagement');
  }
  async function saveCategory(values) {
    const saved = await persistCategory(values, categoryForm.category);
    if (saved) { setCategoryForm(null); }
  }
  function deleteCategory() {
    // Replace this feedback with the deletion request when the endpoint is available.
    showToast({ type: 'info', title: 'Exclusão ainda indisponível', message: 'Sua categoria foi mantida. Essa função será conectada em breve.' });
  }
  async function confirmTranscription(transcription) {
    try {
      await createTransaction(transcription, onboarding?.session?.accessToken);
      setDashboardRevision(value => value + 1);
      showToast({ type: 'success', title: 'Transação registrada!', message: 'Seu lançamento foi salvo com sucesso.' });
      if (selected === 'AccountManagement') { accountList.retry(); cardList.retry(); }
      if (cardUuid) { setCardRevision(value => value + 1); }
      if (accountUuid) { setAccountRevision(value => value + 1); }
    } catch (failure) {
      showToast({ type: 'error', title: 'Não foi possível registrar', message: failure.message });
      throw failure;
    }
  }
  function renderContent() {
    if (selected === 'Home') { return <HomeScreen profile={onboarding?.profile} accessToken={onboarding?.session?.accessToken} revision={dashboardRevision} onOpenAccount={openAccount} onOpenCard={openInvoice} onViewCards={() => setSelected('AccountManagement')} onOpenTransaction={openDetails} onViewStatement={() => setSelected('Statement')} />; }
    if (selected === 'Statement') { return <StatementScreen accessToken={onboarding?.session?.accessToken} onOpenTransaction={openDetails} />; }
    if (selected === 'AccountManagement') {
      if (accountForm) {
        const close = () => setAccountForm(null);
        if (accountForm.kind === 'card') { return <CreateCreditCardScreen key={accountForm.card?.uuid || 'new-card'} card={accountForm.card} onCancel={close} onCreated={() => { close(); setCardRevision(value => value + 1); }} />; }
        return <CreateAccountScreen key={accountForm.account?.uuid || 'new-account'} route={{ params: { fromManagement: true, account: accountForm.account } }} navigation={{ goBack: close, reset: () => { close(); setAccountRevision(value => value + 1); } }} />;
      }
      if (cardUuid) { return <CreditCardDetailsScreen key={cardUuid} uuid={cardUuid} accessToken={onboarding?.session?.accessToken} onBack={() => { setCardUuid(null); setInvoiceToOpen(null); }} onEdit={card => setAccountForm({ kind: 'card', card })} revision={cardRevision} onPayment={() => { accountList.retry(); cardList.retry(); }} onOpenTransaction={openDetails} initialInvoiceUuid={invoiceToOpen} />; }
      if (accountUuid) { return <AccountDetailsScreen key={accountUuid} uuid={accountUuid} accessToken={onboarding?.session?.accessToken} onBack={() => setAccountUuid(null)} onEdit={account => setAccountForm({ kind: 'account', account })} revision={accountRevision} onOpenTransaction={openDetails} />; }
      return <AccountsScreen {...accountList} cards={cardList.cards} cardsLoading={cardList.loading} cardsError={cardList.error} onRetryCards={cardList.retry} onOpenCard={setCardUuid} onRetry={accountList.retry} onCreate={() => setAccountForm({ kind: 'account', account: null })} onCreateCard={() => setAccountForm({ kind: 'card' })} onEdit={account => setAccountUuid(account.uuid)} />;
    }
    if (categoryForm) {
      return <CategoryFormScreen key={categoryForm.category?.uuid ?? categoryForm.category?.name ?? 'new-category'} category={categoryForm.category} existingCategories={[...defaultCategories, ...categories]} saving={saving} onSave={saveCategory} onCancel={() => setCategoryForm(null)} />;
    }
    return <CategoriesScreen categories={categories} defaultCategories={defaultCategories} loading={loading} error={error} onRetry={retry} onCreate={() => setCategoryForm({ category: null })} onEdit={category => setCategoryForm({ category })} onDelete={deleteCategory} />;
  }
  function renderProfile() {
    const backToProfile = () => setProfileForm(null);
    if (profileForm === 'edit') { return <EditProfileScreen profile={onboarding?.profile} onSave={onboarding?.updateProfile} onBack={backToProfile} />; }
    if (profileForm === 'password') { return <ChangePasswordScreen onSave={onboarding?.changePassword} onBack={backToProfile} onForgotPassword={() => setProfileForm('recovery')} />; }
    if (profileForm === 'recovery') { return <ForgotPasswordScreen initialEmail={onboarding?.profile?.email} onBack={() => setProfileForm('password')} backLabel="Voltar para alterar senha" />; }
    return <ProfileScreen profile={onboarding?.profile} onBack={() => setProfileVisible(false)} onLogout={onboarding.logout}
      onEdit={() => setProfileForm('edit')} onPassword={() => setProfileForm('password')}
      onSupport={() => showToast({ type: 'info', message: 'O suporte estará disponível em breve.' })} />;
  }
  return <View style={styles.background}>
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      <View testID="app-header" accessibilityElementsHidden={!showAppHeader} importantForAccessibility={showAppHeader ? 'auto' : 'no-hide-descendants'}
        style={[styles.header, !showAppHeader && styles.hidden]}><AppHeader profile={onboarding?.profile} onOpenProfile={() => { setProfileForm(null); setProfileVisible(true); }} /></View>
      <View accessibilityElementsHidden={profileVisible} importantForAccessibility={profileVisible ? 'no-hide-descendants' : 'auto'}
        style={[styles.content, (itemDetails || profileVisible) && styles.hidden]}>{renderContent()}</View>
      {profileVisible && <View style={styles.profile}>{renderProfile()}</View>}
      {itemDetails && <View style={styles.content}>{itemDetails.purchase
        ? <CreditCardPurchaseDetailsScreen key={itemDetails.uuid} uuid={itemDetails.uuid} selectedInvoiceUuid={itemDetails.invoiceUuid} accessToken={onboarding?.session?.accessToken} onBack={() => setItemDetails(null)} onOpenInvoice={openInvoice} />
        : <TransactionDetailsScreen key={itemDetails.uuid} uuid={itemDetails.uuid} accessToken={onboarding?.session?.accessToken} onBack={() => setItemDetails(null)} />}</View>}
      {!accountForm && !profileVisible && <BottomNavigator selected={selected} onSelect={key => { setItemDetails(null); setInvoiceToOpen(null); setCategoryForm(null); setAccountForm(null); setCardUuid(null); setAccountUuid(null); setSelected(key); }} onMicrophone={() => setVoiceVisible(true)} microphoneOpen={voiceVisible} />}
    </View>
    <VoiceDrawer visible={voiceVisible} onClose={() => setVoiceVisible(false)} onConfirm={confirmTranscription} />
  </View>;
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
  content: { flex: 1, paddingBottom: 18 },
  profile: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  hidden: { display: 'none' },
});
