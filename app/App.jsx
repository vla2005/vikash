import React from 'react';
import { StatusBar } from 'react-native';
import { AppSkeleton } from './src/components/Skeleton';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import useAppFonts from './src/hooks/useAppFonts';
import useRecoveryLink from './src/hooks/useRecoveryLink';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

export default function App() {
  const fontsReady = useAppFonts();
  const recovery = useRecoveryLink();
  if (!fontsReady || !recovery.ready) { return <AppSkeleton />; }
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ToastProvider>{recovery.route?.kind === 'reset'
        ? <ResetPasswordScreen key={recovery.route.token} token={recovery.route.token} onBack={recovery.exit} onRequestLink={recovery.openForgot} />
        : recovery.route?.kind === 'forgot'
          ? <ForgotPasswordScreen onBack={recovery.exit} />
          : <OnboardingProvider><AppNavigator key={recovery.route?.kind || 'default'} initialRouteName={recovery.route?.kind === 'login' ? 'Login' : 'Home'} /></OnboardingProvider>}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
