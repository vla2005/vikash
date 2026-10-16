import { createAssistantStartupTrace } from '../utils/assistantStartup';
import { assistantDockAnchor, measureAssistantNode } from '../utils/assistantMotion';
import runSceneUpdate from '../utils/runSceneUpdate';
import { ThemeVariant, useTheme, useThemeStyles } from '../contexts/ThemeContext';
import AmbientLight from '../components/silver/AmbientLight';
import { header } from '../theme/silver';
import DockProvider from '../components/silver/DockProvider';
import DockBackdrop from '../components/silver/DockBackdrop';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import StatementScreen from '../screens/StatementScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CreateCreditCardScreen from '../screens/CreateCreditCardScreen';
import CreditCardDetailsScreen from '../screens/CreditCardDetailsScreen';
import CreditCardInitialInvoicesScreen from '../screens/CreditCardInitialInvoicesScreen';
import AccountDetailsScreen from '../screens/AccountDetailsScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import CreditCardPurchaseDetailsScreen from '../screens/CreditCardPurchaseDetailsScreen';
import EditTransactionScreen from '../screens/EditTransactionScreen';
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
import FloatingAppHeader from '../components/silver/FloatingAppHeader';
import ProfileSwitcherDrawer from '../components/ProfileSwitcherDrawer';
import VoiceDrawer from '../components/VoiceDrawer';
import AssistantExperience from '../components/assistant/AssistantExperience';
import ScreenTransition from '../components/ScreenTransition';
import { createTransaction } from '../services/transactions';

export default function MainTabs({ navigation }) {
  const styles = useThemeStyles(createStyles);
  const { colors, scheme } = useTheme();
  const [selected, setSelected] = useState('Home');
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [startupTrace,setStartupTrace]=useState(null);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const appFrame = useRef(null), assistantButton = useRef(null);
  const measureAssistantDock = useCallback(async () => {
    const [rect,viewport] = await Promise.all([measureAssistantNode(assistantButton.current),measureAssistantNode(appFrame.current)]);
    return assistantDockAnchor(rect,viewport);
  },[]);
  const [assistantCovered,setAssistantCovered] = useState(false);
  const coverAssistantDock = useCallback(() => setAssistantCovered(true),[]);
  const closeAssistant = useCallback(() => {setAssistantVisible(false);setAssistantCovered(false);},[]);
  const [assistantOrigin, setAssistantOrigin] = useState(null);
  const openAssistant = useCallback(async node => {
    const trace=createAssistantStartupTrace(Platform.OS);
    assistantButton.current=node;
    const anchor=await measureAssistantDock();
    trace?.mark('dock-measured');
    setStartupTrace(trace);
    setAssistantCovered(false);
    setAssistantOrigin(anchor);
    setAssistantVisible(true);
  }, [measureAssistantDock]);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profilesVisible, setProfilesVisible] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [accountForm, setAccountForm] = useState(null);
  const [cardUuid, setCardUuid] = useState(null);
  const [initialBalanceUuid, setInitialBalanceUuid] = useState(null);
  const [cardRevision, setCardRevision] = useState(0);
  const [accountUuid, setAccountUuid] = useState(null);
  const [accountRevision, setAccountRevision] = useState(0);
  const [dashboardRevision, setDashboardRevision] = useState(0);
  const [statementRevision, setStatementRevision] = useState(0);
  const [itemDetails, setItemDetails] = useState(null);
  const [itemEdit, setItemEdit] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [invoiceToOpen, setInvoiceToOpen] = useState(null);
  const { showToast } = useToast();
  const onboarding = useOnboarding();
  const {
    categories,
    defaultCategories,
    loading,
    error,
    retry,
    saving,
    saveCategory: persistCategory,
    removeCategory,
  } = useCategories(
    onboarding?.session?.accessToken,
    selected === 'Categories',
  );
  const [categoryForm, setCategoryForm] = useState(null);
  const accountList = useAccounts(
    onboarding?.session?.accessToken,
    selected === 'AccountManagement' &&
      !accountForm &&
      !cardUuid &&
      !accountUuid,
  );
  const cardList = useCreditCards(
    onboarding?.session?.accessToken,
    selected === 'AccountManagement' &&
      !accountForm &&
      !cardUuid &&
      !accountUuid,
  );
  const retryAccounts = accountList.retry;
  const retryCards = cardList.retry;
  const insets = useSafeAreaInsets();
  const showAppHeader =
    !profileVisible &&
    !itemDetails &&
    !(
      selected === 'AccountManagement' &&
      (accountForm || cardUuid || accountUuid)
    ) &&
    !(selected === 'Categories' && categoryForm);
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (profileVisible && profileForm) {
          setProfileForm(null);
          return true;
        }
        if (profileVisible) {
          setProfileVisible(false);
          return true;
        }
        if (itemEdit) {
          if (!itemSaving) {
            setItemEdit(null);
          }
          return true;
        }
        if (itemDetails) {
          setItemDetails(null);
          return true;
        }
        if (initialBalanceUuid) {
          return false;
        }
        if (accountForm) {
          setAccountForm(null);
          return true;
        }
        if (cardUuid) {
          setCardUuid(null);
          return true;
        }
        if (accountUuid) {
          setAccountUuid(null);
          return true;
        }
        if (categoryForm) {
          setCategoryForm(null);
          return true;
        }
        if (selected === 'Home') {
          return false;
        }
        setSelected('Home');
        return true;
      },
    );
    return () => subscription.remove();
  }, [
    selected,
    categoryForm,
    accountForm,
    cardUuid,
    accountUuid,
    itemDetails,
    itemEdit,
    itemSaving,
    profileVisible,
    profileForm,
    initialBalanceUuid,
  ]);
  const openDetails = useCallback((row, invoiceUuid) => {
    runSceneUpdate(() => {
      setInvoiceToOpen(null);
      setItemDetails({
        uuid: row.purchaseUuid || row.id,
        purchase: !!row.purchaseUuid,
        invoiceUuid,
      });
    });
  }, []);
  const refreshAfterDeletion = useCallback(() => {
    setDashboardRevision(value => value + 1);
    setStatementRevision(value => value + 1);
    setCardRevision(value => value + 1);
    setAccountRevision(value => value + 1);
    retryAccounts();
    retryCards();
  }, [retryAccounts, retryCards]);
  function closeDeletedDetails() {
    setItemDetails(null);
    refreshAfterDeletion();
  }
  const openInvoice = useCallback((card, invoice) => {
    runSceneUpdate(() => {
      setItemDetails(null);
      setAccountUuid(null);
      setSelected('AccountManagement');
      setCardUuid(card);
      setInvoiceToOpen(invoice);
    });
  }, []);
  const openAccount = useCallback(uuid => {
    runSceneUpdate(() => {
      setItemDetails(null);
      setCardUuid(null);
      setInvoiceToOpen(null);
      setAccountForm(null);
      setAccountUuid(uuid);
      setSelected('AccountManagement');
    });
  }, []);
  const saveCategory = useCallback(async values => {
    const saved = await persistCategory(values, categoryForm.category);
    if (saved) {
      setCategoryForm(null);
    }
  }, [persistCategory, categoryForm]);
  const deleteCategory = useCallback(async category => {
    if (!(await removeCategory(category))) {
      throw new Error('Aguarde a alteração em andamento.');
    }
    setCategoryForm(null);
    setDashboardRevision(value => value + 1);
    setStatementRevision(value => value + 1);
    setCardRevision(value => value + 1);
    setAccountRevision(value => value + 1);
    showToast({
      type: 'success',
      message: 'Categoria excluída. Seus lançamentos foram preservados.',
    });
  }, [removeCategory, showToast]);
  async function confirmTranscription(transcription) {
    await createTransaction(transcription, onboarding?.session?.accessToken);
    setDashboardRevision(value => value + 1);
    showToast({
      type: 'success',
      title: 'Transação registrada!',
      message: 'Seu lançamento foi salvo com sucesso.',
    });
    if (selected === 'AccountManagement') {
      accountList.retry();
      cardList.retry();
    }
    if (cardUuid) {
      setCardRevision(value => value + 1);
    }
    if (accountUuid) {
      setAccountRevision(value => value + 1);
    }
  }
  const viewCards = useCallback(() => runSceneUpdate(() => setSelected('AccountManagement')), []);
  const viewStatement = useCallback(() => runSceneUpdate(() => setSelected('Statement')), []);
  const createAccount = useCallback(() => runSceneUpdate(() => setAccountForm({ kind: 'account', account: null })), []);
  const createCard = useCallback(() => runSceneUpdate(() => setAccountForm({ kind: 'card' })), []);
  const editAccount = useCallback(account => runSceneUpdate(() => setAccountUuid(account.uuid)), []);
  const createCategory = useCallback(() => runSceneUpdate(() => setCategoryForm({ category: null })), []);
  const editCategory = useCallback(category => runSceneUpdate(() => setCategoryForm({ category })), []);
  const changeTab = useCallback(key => runSceneUpdate(() => {
    setItemDetails(null);
    setInvoiceToOpen(null);
    setCategoryForm(null);
    setAccountForm(null);
    setCardUuid(null);
    setAccountUuid(null);
    setSelected(key);
  }), []);
  function renderContent() {
    if (selected === 'Home') {
      return (
        <HomeScreen
          profile={onboarding?.profile}
          accessToken={onboarding?.session?.accessToken}
          revision={dashboardRevision}
          onOpenAccount={openAccount}
          onOpenCard={openInvoice}
          onViewCards={viewCards}
          onOpenTransaction={openDetails}
          onViewStatement={viewStatement}
        />
      );
    }
    if (selected === 'Statement') {
      return (
        <StatementScreen
          accessToken={onboarding?.session?.accessToken}
          onOpenTransaction={openDetails}
          revision={statementRevision}
          onDeleted={refreshAfterDeletion}
        />
      );
    }
    if (selected === 'AccountManagement') {
      if (initialBalanceUuid) {
        return (
          <CreditCardInitialInvoicesScreen
            key={initialBalanceUuid}
            uuid={initialBalanceUuid}
            accessToken={onboarding?.session?.accessToken}
            onBack={() => setInitialBalanceUuid(null)}
            onSaved={() => {
              setInitialBalanceUuid(null);
              setCardRevision(value => value + 1);
              setDashboardRevision(value => value + 1);
              cardList.retry();
            }}
          />
        );
      }
      if (accountForm) {
        const close = () => setAccountForm(null);
        if (accountForm.kind === 'card') {
          return (
            <CreateCreditCardScreen
              key={accountForm.card?.uuid || 'new-card'}
              card={accountForm.card}
              onCancel={close}
              onCreated={() => {
                close();
                setCardRevision(value => value + 1);
                setDashboardRevision(value => value + 1);
              }}
            />
          );
        }
        return (
          <CreateAccountScreen
            key={accountForm.account?.uuid || 'new-account'}
            route={{
              params: { fromManagement: true, account: accountForm.account },
            }}
            navigation={{
              goBack: close,
              reset: () => {
                close();
                setAccountRevision(value => value + 1);
              },
            }}
          />
        );
      }
      if (cardUuid) {
        return (
          <CreditCardDetailsScreen
            key={cardUuid}
            uuid={cardUuid}
            accessToken={onboarding?.session?.accessToken}
            onBack={() => {
              setCardUuid(null);
              setInvoiceToOpen(null);
            }}
            onDistribute={() => setInitialBalanceUuid(cardUuid)}
            onEdit={card => setAccountForm({ kind: 'card', card })}
            revision={cardRevision}
            onPayment={() => {
              accountList.retry();
              cardList.retry();
            }}
            onOpenTransaction={openDetails}
            initialInvoiceUuid={invoiceToOpen}
            onDeleted={refreshAfterDeletion}
          />
        );
      }
      if (accountUuid) {
        return (
          <AccountDetailsScreen
            key={accountUuid}
            uuid={accountUuid}
            accessToken={onboarding?.session?.accessToken}
            onBack={() => setAccountUuid(null)}
            onEdit={account => setAccountForm({ kind: 'account', account })}
            revision={accountRevision}
            onOpenTransaction={openDetails}
            onDeleted={refreshAfterDeletion}
          />
        );
      }
      return (
        <AccountsScreen
          {...accountList}
          profile={onboarding?.profile}
          cards={cardList.cards}
          cardsLoading={cardList.loading}
          cardsError={cardList.error}
          onRetryCards={cardList.retry}
          onOpenCard={openInvoice}
          onRetry={accountList.retry}
          onCreate={createAccount}
          onCreateCard={createCard}
          onEdit={editAccount}
        />
      );
    }
    if (categoryForm) {
      return (
        <CategoryFormScreen
          key={
            categoryForm.category?.uuid ??
            categoryForm.category?.name ??
            'new-category'
          }
          category={categoryForm.category}
          existingCategories={[...defaultCategories, ...categories]}
          saving={saving}
          onSave={saveCategory}
          onDelete={deleteCategory}
          onCancel={() => setCategoryForm(null)}
        />
      );
    }
    return (
      <CategoriesScreen
        categories={categories}
        defaultCategories={defaultCategories}
        accessToken={onboarding?.session?.accessToken}
        revision={dashboardRevision + statementRevision}
        loading={loading}
        error={error}
        onRetry={retry}
        onCreate={createCategory}
        onEdit={editCategory}
        onDelete={deleteCategory}
      />
    );
  }
  function renderProfile() {
    const backToProfile = () => setProfileForm(null);
    if (profileForm === 'edit') {
      return (
        <EditProfileScreen
          profile={onboarding?.profile}
          onSave={onboarding?.updateProfile}
          onBack={backToProfile}
        />
      );
    }
    if (profileForm === 'password') {
      return (
        <ChangePasswordScreen
          onSave={onboarding?.changePassword}
          onBack={backToProfile}
          onForgotPassword={() => setProfileForm('recovery')}
        />
      );
    }
    if (profileForm === 'recovery') {
      return (
        <ForgotPasswordScreen
          initialEmail={onboarding?.profile?.email}
          onBack={() => setProfileForm('password')}
          backLabel="Voltar para alterar senha"
        />
      );
    }
    return (
      <ProfileScreen
        profile={onboarding?.profile}
        onBack={() => setProfileVisible(false)}
        onLogout={onboarding.logout}
        onEdit={() => setProfileForm('edit')}
        onPassword={() => setProfileForm('password')}

      />
    );
  }
  function getScene() {
    const order = [
      'Home',
      'Statement',
      'AccountManagement',
      'Categories',
    ].indexOf(selected);
    const base = { key: selected, depth: 0, order };
    if (selected === 'AccountManagement') {
      if (initialBalanceUuid) {
        base.key += `:initial:${initialBalanceUuid}`;
        base.depth = 3;
      } else if (accountForm) {
        base.key += `:form:${accountForm.kind}:${
          accountForm.card?.uuid || accountForm.account?.uuid || 'new'
        }`;
        base.depth = cardUuid || accountUuid ? 2 : 1;
      } else if (cardUuid || accountUuid) {
        base.key += `:details:${cardUuid || accountUuid}`;
        base.depth = 1;
      }
    } else if (selected === 'Categories' && categoryForm) {
      base.key += `:form:${
        categoryForm.category?.uuid || categoryForm.category?.name || 'new'
      }`;
      base.depth = 1;
    }
    if (profileVisible) {
      return {
        key: `profile:${profileForm || 'overview'}`,
        depth: profileForm === 'recovery' ? 3 : profileForm ? 2 : 1,
        order,
      };
    }
    if (itemEdit) {
      return {
        key: `edit:${itemEdit.details.uuid}`,
        depth: base.depth + 2,
        order,
      };
    }
    if (itemDetails) {
      return {
        key: `transaction:${itemDetails.purchase}:${itemDetails.uuid}`,
        depth: base.depth + 1,
        order,
      };
    }
    return base;
  }
  const scene = getScene();
  const showDock =
    !itemEdit &&
    !accountForm &&
    !initialBalanceUuid &&
    !profileVisible &&
    !categoryForm;
  return (
    <ThemeVariant>
      <DockProvider
        sceneKey={scene.key}
        bottomInset={insets.bottom}
        headerHeight={showAppHeader ? header.height : 0}
      >
        <AssistantExperience captureScope={`${onboarding?.activeProfileId || "none"}:${scene.key}:${scheme}`} key={onboarding?.activeProfileId || 'no-profile'} visible={assistantVisible} dockOrigin={assistantOrigin} startupTrace={startupTrace} appFrameRef={appFrame} getDockOrigin={measureAssistantDock} onDockCovered={coverAssistantDock} onClose={closeAssistant}
          profileId={onboarding?.activeProfileId} accessToken={onboarding?.session?.accessToken}>
        <View
          style={[
            styles.background,
            { backgroundColor: colors.background },
          ]}
        >
          <StatusBar
            barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={colors.background}
          />
          <View style={[styles.canvas, { paddingTop: insets.top }]}>
            {Platform.OS === 'android' && <AmbientLight enabled={!voiceVisible && !assistantVisible} />}
            <DockBackdrop style={styles.backdrop}>
              {/* No Android, a luz do topo não precisa entrar na amostra do dock. */}
              {Platform.OS !== 'android' && <AmbientLight enabled={!voiceVisible && !assistantVisible} />}
              <ScreenTransition
                sceneKey={scene.key}
                depth={scene.depth}
                order={scene.order}
              >
                <View
                  accessibilityElementsHidden={profileVisible}
                  importantForAccessibility={
                    profileVisible ? 'no-hide-descendants' : 'auto'
                  }
                  style={[
                    styles.content,
                    (itemDetails || profileVisible) && styles.hidden,
                  ]}
                >
                  {renderContent()}
                </View>
                {profileVisible && (
                  <View style={styles.profile}>{renderProfile()}</View>
                )}
                {itemEdit ? (
                  <View style={styles.content}>
                    <EditTransactionScreen
                      key={itemEdit.details.uuid}
                      details={itemEdit.details}
                      purchase={itemEdit.purchase}
                      accessToken={onboarding?.session?.accessToken}
                      onSavingChange={setItemSaving}
                      onBack={() => setItemEdit(null)}
                      onSaved={() => {
                        setItemEdit(null);
                        closeDeletedDetails();
                      }}
                    />
                  </View>
                ) : (
                  itemDetails && (
                    <View style={styles.content}>
                      {itemDetails.purchase ? (
                        <CreditCardPurchaseDetailsScreen
                          key={itemDetails.uuid}
                          uuid={itemDetails.uuid}
                          selectedInvoiceUuid={itemDetails.invoiceUuid}
                          accessToken={onboarding?.session?.accessToken}
                          onBack={() => setItemDetails(null)}
                          onOpenInvoice={openInvoice}
                          onDeleted={closeDeletedDetails}
                          onEdit={details =>
                            setItemEdit({ details, purchase: true })
                          }
                        />
                      ) : (
                        <TransactionDetailsScreen
                          key={itemDetails.uuid}
                          uuid={itemDetails.uuid}
                          accessToken={onboarding?.session?.accessToken}
                          onBack={() => setItemDetails(null)}
                          onDeleted={closeDeletedDetails}
                          onEdit={details =>
                            setItemEdit({ details, purchase: false })
                          }
                        />
                      )}
                    </View>
                  )
                )}
              </ScreenTransition>
            </DockBackdrop>
            <FloatingAppHeader
              visible={showAppHeader && !voiceVisible}
              topInset={insets.top}
              profile={onboarding?.profile}
              onOpenProfile={() => setProfilesVisible(true)}
            />
            {showDock && !voiceVisible && (
              <BottomNavigator
                selected={selected}
                onSelect={changeTab}
                onAssistant={openAssistant}
                assistantOpen={assistantCovered}
                onMicrophone={() => setVoiceVisible(true)}
                microphoneOpen={voiceVisible}
              />
            )}
          </View>
          <VoiceDrawer
            visible={voiceVisible}
            onClose={() => setVoiceVisible(false)}
            onConfirm={confirmTranscription}
          />
          <ProfileSwitcherDrawer
            visible={profilesVisible}
            profiles={onboarding.profiles}
            activeProfileId={onboarding.activeProfileId}
            onClose={() => setProfilesVisible(false)}
            onSelect={onboarding.switchProfile}
            onLogout={onboarding.logout}
            onAdd={() => navigation.navigate('Login', { addingAccount: true })}
            onRequireLogin={profile =>
              navigation.navigate('Login', {
                addingAccount: true,
                email: profile.email,
              })
            }
            onOpenProfile={() => {
              setProfileForm(null);
              setProfileVisible(true);
            }}
          />
        </View>
        </AssistantExperience>
      </DockProvider>
    </ThemeVariant>
  );
}
const createStyles = colors =>
  StyleSheet.create({
    background: { flex: 1, backgroundColor: colors.background },
    canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
    backdrop: { flex: 1 },
    content: { flex: 1, paddingBottom: 18 },
    profile: { flex: 1 },
    hidden: { display: 'none' },
  });
