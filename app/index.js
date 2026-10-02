/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { expo as appConfig } from './app.json';

AppRegistry.registerComponent(appConfig.name, () => App);

// Expo Go loads "main"; the native projects retain the "Vikash" entry.
registerRootComponent(App);
