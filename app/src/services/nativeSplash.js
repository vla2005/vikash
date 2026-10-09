import * as SplashScreen from 'expo-splash-screen';

// Mantém a tela nativa até a marca do React Native estar pronta para aparecer.
SplashScreen.preventAutoHideAsync().catch(() => {});

export function hideNativeSplash() {
  return SplashScreen.hideAsync().catch(() => {});
}
