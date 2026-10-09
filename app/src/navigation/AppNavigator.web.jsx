import React, { useState } from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AddFinancialItemScreen from '../screens/AddFinancialItemScreen';
import CreateCreditCardScreen from '../screens/CreateCreditCardScreen';
import AccountsSummaryScreen from '../screens/AccountsSummaryScreen';
import MainTabs from './MainTabs';
import ProtectedScreen from './ProtectedScreen';
import { useOnboarding } from '../contexts/OnboardingContext';
import SessionRetry from '../components/SessionRetry';
import { AppSkeleton } from '../components/Skeleton';

const screens = { Home: MainTabs, Login: LoginScreen, Register: RegisterScreen, ForgotPassword: ForgotPasswordScreen, CreateAccount: CreateAccountScreen, AddFinancialItem: AddFinancialItemScreen, CreateCreditCard: CreateCreditCardScreen, Accounts: AccountsSummaryScreen };

// A previa web usa as mesmas telas; o app nativo usa o stack nativo.
export default function AppNavigator({ initialRouteName = 'Home' }) {
  const { ready, restoreError, retryRestore } = useOnboarding();
  const [stack, setStack] = useState([{ name: initialRouteName }]);
  const route = stack[stack.length - 1];
  const Screen = screens[route.name];
  const navigation = {
    navigate: (name, params) => setStack(previous => [...previous, { name, params }]),
    push: (name, params) => setStack(previous => [...previous, { name, params }]),
    goBack: () => setStack(previous => previous.length > 1 ? previous.slice(0, -1) : [{ name: 'Home' }]),
    reset: ({ routes }) => setStack(routes),
  };
  if (!ready) { return <AppSkeleton />; }
  if (restoreError) { return <SessionRetry message={restoreError} onRetry={retryRestore} />; }
  const key = `${route.name}-${route.params?.accountUuid || ''}`;
  return ['Home', 'CreateAccount', 'AddFinancialItem', 'CreateCreditCard', 'Accounts'].includes(route.name)
    ? <ProtectedScreen key={key} component={Screen} route={route} navigation={navigation} />
    : <Screen key={key} route={route} navigation={navigation} />;
}
