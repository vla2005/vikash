import React from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import useAppFonts from './src/hooks/useAppFonts';

export default function App() {
  const fontsReady = useAppFonts();
  if (!fontsReady) { return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>; }
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ToastProvider><OnboardingProvider>
          <AppNavigator />
      </OnboardingProvider></ToastProvider>
    </SafeAreaProvider>
  );
}
