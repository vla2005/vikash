import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { assistantTypes } from '../config/assistant';
export async function pickAssistantAttachments(kind) {
  if (kind === 'files') {
    const result = await DocumentPicker.getDocumentAsync({
      type: assistantTypes, multiple: true, copyToCacheDirectory: true,
    });
    return result.canceled ? [] : result.assets;
  }
  if (kind === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Permita o acesso à câmera nas configurações para fotografar.');
  }
  const result = await (kind === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({
    mediaTypes: ['images'], allowsEditing: false, quality: 0.85,
    ...(kind !== 'camera' && { allowsMultipleSelection: true, selectionLimit: 5 }),
    exif: false, base64: false,
  });
  return result.canceled ? [] : result.assets.map(asset => ({
    ...asset, name: asset.fileName || `Foto-${Date.now()}.jpg`,
  }));
}
