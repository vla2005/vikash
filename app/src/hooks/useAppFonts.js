import { useFonts } from 'expo-font';

export default function useAppFonts() {
  const [loaded, error] = useFonts({
    VikashSans: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    VikashSansMedium: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    VikashSansBold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
  });
  return loaded || !!error;
}
