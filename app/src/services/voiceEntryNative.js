import { Platform } from 'react-native';
export function voiceEntryNative() {
  if (Platform.OS !== 'android') return null;
  return require('expo').requireOptionalNativeModule('VikashVoiceEntry');
}
