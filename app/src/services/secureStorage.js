import * as SecureStore from 'expo-secure-store';

export const readValue = key => SecureStore.getItemAsync(key);
export const writeValue = (key, value) => SecureStore.setItemAsync(key, value);
export const removeValue = key => SecureStore.deleteItemAsync(key);
