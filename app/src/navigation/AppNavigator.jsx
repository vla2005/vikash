import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AddFinancialItemScreen from '../screens/AddFinancialItemScreen';
import CreateCreditCardScreen from '../screens/CreateCreditCardScreen';
import AccountsSummaryScreen from '../screens/AccountsSummaryScreen';
import { colors } from '../theme';
import { useIsFocused } from '@react-navigation/native';
import { useOnboarding } from '../contexts/OnboardingContext';
import MainTabs from './MainTabs';
import ProtectedScreen from './ProtectedScreen';
import SessionRetry from '../components/SessionRetry';
import { AppSkeleton } from '../components/Skeleton';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary, text: colors.text, card: colors.background } };

function ProtectedHome(props) { return <ProtectedScreen component={MainTabs} active={useIsFocused()} {...props} />; }
function ProtectedCreateAccount(props) { return <ProtectedScreen component={CreateAccountScreen} active={useIsFocused()} {...props} />; }
function ProtectedAddFinancialItem(props) { return <ProtectedScreen component={AddFinancialItemScreen} active={useIsFocused()} {...props} />; }
function ProtectedCreateCreditCard(props) { return <ProtectedScreen component={CreateCreditCardScreen} active={useIsFocused()} {...props} />; }
function ProtectedAccounts(props) { return <ProtectedScreen component={AccountsSummaryScreen} active={useIsFocused()} {...props} />; }

export default function AppNavigator({ initialRouteName = 'Home' }) {
  const { ready, restoreError, retryRestore } = useOnboarding();
  if (!ready) { return <AppSkeleton />; }
  if (restoreError) { return <SessionRetry message={restoreError} onRetry={retryRestore} />; }
  return <NavigationContainer theme={theme}>
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={ProtectedHome} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="CreateAccount" component={ProtectedCreateAccount} />
      <Stack.Screen name="AddFinancialItem" component={ProtectedAddFinancialItem} />
      <Stack.Screen name="CreateCreditCard" component={ProtectedCreateCreditCard} />
      <Stack.Screen name="Accounts" component={ProtectedAccounts} />
    </Stack.Navigator>
  </NavigationContainer>;
}
