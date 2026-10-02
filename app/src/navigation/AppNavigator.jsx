import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import AccountsSummaryScreen from '../screens/AccountsSummaryScreen';
import { colors } from '../theme';
import { useIsFocused } from '@react-navigation/native';
import { useOnboarding } from '../contexts/OnboardingContext';
import MainTabs from './MainTabs';
import ProtectedScreen from './ProtectedScreen';

const Stack = createNativeStackNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary, text: colors.text, card: colors.background } };

function ProtectedHome(props) { return <ProtectedScreen component={MainTabs} active={useIsFocused()} {...props} />; }
function ProtectedCreateAccount(props) { return <ProtectedScreen component={CreateAccountScreen} active={useIsFocused()} {...props} />; }
function ProtectedAccounts(props) { return <ProtectedScreen component={AccountsSummaryScreen} active={useIsFocused()} {...props} />; }

export default function AppNavigator() {
  const { ready } = useOnboarding();
  if (!ready) { return null; }
  return <NavigationContainer theme={theme}>
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={ProtectedHome} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="CreateAccount" component={ProtectedCreateAccount} />
      <Stack.Screen name="Accounts" component={ProtectedAccounts} />
    </Stack.Navigator>
  </NavigationContainer>;
}
