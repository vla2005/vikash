import Constants from 'expo-constants';
import { Platform } from 'react-native';

const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultHost = developmentHost || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:8080`).replace(/\/+$/, '');
