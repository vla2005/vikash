import React, { useCallback, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import AnimatedSplash from './src/components/AnimatedSplash';
import AppMotionPolicy from './src/components/AppMotionPolicy';
import ScreenTransition from './src/components/ScreenTransition';
import { AppSkeleton } from './src/components/Skeleton';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  ThemeProvider,
  ThemeVariant,
  useTheme,
} from './src/contexts/ThemeContext';
import ThemeBrowserSync from './src/components/ThemeBrowserSync';
import useAppFonts from './src/hooks/useAppFonts';
import useRecoveryLink from './src/hooks/useRecoveryLink';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

export default function App() {
  return (
    <>
      <AppMotionPolicy />
      <ThemeProvider>
        <ThemeVariant>
          <AppContent />
        </ThemeVariant>
      </ThemeProvider>
    </>
  );
}

function AppContent() {
  const { colors, scheme } = useTheme();
  const fontsReady = useAppFonts();
  const recovery = useRecoveryLink();
  const ready = fontsReady && recovery.ready;
  const [showSplash, setShowSplash] = useState(Platform.OS !== 'web');
  const finishSplash = useCallback(() => setShowSplash(false), []);
  return (
    <SafeAreaProvider>
      <ThemeBrowserSync />
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={styles.root}
          accessibilityElementsHidden={showSplash}
          importantForAccessibility={
            showSplash ? 'no-hide-descendants' : 'auto'
          }
        >
          <ScreenTransition
            sceneKey={ready ? recovery.route?.kind || 'app' : 'loading'}
            fade
          >
            {ready ? (
              <ToastProvider>
                {recovery.route?.kind === 'reset' ? (
                  <ResetPasswordScreen
                    key={recovery.route.token}
                    token={recovery.route.token}
                    onBack={recovery.exit}
                    onRequestLink={recovery.openForgot}
                  />
                ) : recovery.route?.kind === 'forgot' ? (
                  <ForgotPasswordScreen onBack={recovery.exit} />
                ) : (
                  <OnboardingProvider>
                    <AppNavigator
                      key={recovery.route?.kind || 'default'}
                      initialRouteName={
                        recovery.route?.kind === 'login' ? 'Login' : 'Home'
                      }
                    />
                  </OnboardingProvider>
                )}
              </ToastProvider>
            ) : (
              <AppSkeleton />
            )}
          </ScreenTransition>
        </View>
        {showSplash && <AnimatedSplash ready={ready} onFinish={finishSplash} />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
