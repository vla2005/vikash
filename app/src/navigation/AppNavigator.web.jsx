import React, { useState } from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AccountsSummaryScreen from '../screens/AccountsSummaryScreen';
import MainTabs from './MainTabs';
import ProtectedScreen from './ProtectedScreen';
import { useOnboarding } from '../contexts/OnboardingContext';
import SessionRetry from '../components/SessionRetry';

const screens = { Home: MainTabs, Login: LoginScreen, Register: RegisterScreen, CreateAccount: CreateAccountScreen, Accounts: AccountsSummaryScreen };

// A previa web usa as mesmas telas; o app nativo usa o stack nativo.
export default function AppNavigator() {
  const { ready, restoreError, retryRestore } = useOnboarding();
  const [stack, setStack] = useState([{ name: 'Home' }]);
  const route = stack[stack.length - 1];
  const Screen = screens[route.name];
  const navigation = {
    navigate: (name, params) => setStack(previous => [...previous, { name, params }]),
    push: (name, params) => setStack(previous => [...previous, { name, params }]),
    goBack: () => setStack(previous => previous.length > 1 ? previous.slice(0, -1) : [{ name: 'Home' }]),
    reset: ({ routes }) => setStack(routes),
  };
  if (!ready) { return null; }
  if (restoreError) { return <SessionRetry message={restoreError} onRetry={retryRestore} />; }
  const key = `${route.name}-${route.params?.accountUuid || ''}`;
  return ['Home', 'CreateAccount', 'Accounts'].includes(route.name)
    ? <ProtectedScreen key={key} component={Screen} route={route} navigation={navigation} />
    : <Screen key={key} route={route} navigation={navigation} />;
}
