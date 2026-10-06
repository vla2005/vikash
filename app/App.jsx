import React from 'react';
import { StatusBar } from 'react-native';
import { AppSkeleton } from './src/components/Skeleton';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import useAppFonts from './src/hooks/useAppFonts';

export default function App() {
  const fontsReady = useAppFonts();
  if (!fontsReady) { return <AppSkeleton />; }
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ToastProvider><OnboardingProvider>
          <AppNavigator />
      </OnboardingProvider></ToastProvider>
    </SafeAreaProvider>
  );
}
